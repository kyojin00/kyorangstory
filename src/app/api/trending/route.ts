// src/app/api/trending/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// 트렌딩 점수 계산
// score = likes * 3 + comments * 2 + reactions * 2 - 시간감쇠
function calcScore(likes: number, comments: number, createdAt: string): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const decay    = Math.pow(ageHours + 2, 1.5); // 시간이 지날수록 점수 감소
  return ((likes * 3) + (comments * 2)) / decay;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { searchParams } = new URL(req.url);
  const type   = searchParams.get('type')   ?? 'stories';
  const period = searchParams.get('period') ?? 'day';

  const since = new Date();
  if (period === 'week') since.setDate(since.getDate() - 7);
  else if (period === 'month') since.setDate(since.getDate() - 30);
  else since.setHours(since.getHours() - 24);

  if (type === 'stories') {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('is_public', true)
      .gte('created_at', since.toISOString())
      .limit(50); // 많이 가져와서 점수로 정렬

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json([]);

    // 점수 계산 후 정렬
    const scored = data
      .map(s => ({ ...s, _score: calcScore(s.likes_count ?? 0, s.comments_count ?? 0, s.created_at) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 20);

    // 유저 반응 병합
    if (user) {
      const { data: reactions } = await supabase
        .from('story_reactions').select('story_id, reaction_type')
        .eq('user_id', user.id)
        .in('story_id', scored.map(s => s.id));
      const map = Object.fromEntries((reactions ?? []).map(r => [r.story_id, r.reaction_type]));
      return NextResponse.json(scored.map(s => ({ ...s, user_reaction: map[s.id] ?? null })));
    }
    return NextResponse.json(scored);
  }

  // posts 트렌딩
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .gte('created_at', since.toISOString())
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!posts?.length) return NextResponse.json([]);

  const scored = posts
    .map(p => ({ ...p, _score: calcScore(p.likes_count ?? 0, p.comments_count ?? 0, p.created_at) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 20);

  const userIds = [...new Set(scored.map(p => p.user_id))];
  const { data: profiles } = await supabase
    .from('profiles').select('id, username, display_name, avatar_url').in('id', userIds);
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  let likedSet = new Set<string>();
  if (user) {
    const { data: likes } = await supabase
      .from('post_likes').select('post_id')
      .eq('user_id', user.id).in('post_id', scored.map(p => p.id));
    likedSet = new Set((likes ?? []).map(l => l.post_id));
  }

  return NextResponse.json(scored.map(p => ({
    ...p,
    profile:  profileMap[p.user_id] ?? null,
    is_liked: likedSet.has(p.id),
  })));
}