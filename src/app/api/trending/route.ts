// src/app/api/trending/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/trending?type=stories|posts&period=day|week
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { searchParams } = new URL(req.url);
  const type   = searchParams.get('type')   ?? 'stories'; // stories | posts
  const period = searchParams.get('period') ?? 'day';     // day | week

  const since = new Date();
  if (period === 'week') since.setDate(since.getDate() - 7);
  else since.setDate(since.getDate() - 1);

  if (type === 'stories') {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('is_public', true)
      .gte('created_at', since.toISOString())
      .order('likes_count', { ascending: false })
      .order('comments_count', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json([]);

    // 유저 반응 병합
    if (user) {
      const { data: reactions } = await supabase
        .from('story_reactions')
        .select('story_id, reaction_type')
        .eq('user_id', user.id)
        .in('story_id', data.map(s => s.id));
      const map = Object.fromEntries((reactions ?? []).map(r => [r.story_id, r.reaction_type]));
      return NextResponse.json(data.map(s => ({ ...s, user_reaction: map[s.id] ?? null })));
    }
    return NextResponse.json(data);
  }

  // posts 트렌딩
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .gte('created_at', since.toISOString())
    .order('likes_count', { ascending: false })
    .order('comments_count', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!posts?.length) return NextResponse.json([]);

  // 프로필 병합
  const userIds = [...new Set(posts.map(p => p.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds);
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  let likedSet = new Set<string>();
  if (user) {
    const { data: likes } = await supabase
      .from('post_likes').select('post_id')
      .eq('user_id', user.id)
      .in('post_id', posts.map(p => p.id));
    likedSet = new Set((likes ?? []).map(l => l.post_id));
  }

  return NextResponse.json(posts.map(p => ({
    ...p,
    profile:  profileMap[p.user_id] ?? null,
    is_liked: likedSet.has(p.id),
  })));
}