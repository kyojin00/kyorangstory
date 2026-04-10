// src/app/api/search/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { searchParams } = new URL(req.url);
  const q    = searchParams.get('q')?.trim() ?? '';
  const type = searchParams.get('type') ?? 'all';

  if (!q) return NextResponse.json({ users: [], posts: [], stories: [] });

  const results: Record<string, any[]> = { users: [], posts: [], stories: [] };

  // ── 유저 검색 (나 자신 제외)
  if (type === 'all' || type === 'users') {
    let query = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, followers_count, bio')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(10);

    if (user) query = query.neq('id', user.id);   // 👈 나 제외

    const { data: users } = await query;
    results.users = users ?? [];
  }

  // ── 게시글 검색 (내 게시글 제외)
  if (type === 'all' || type === 'posts') {
    let query = supabase
      .from('posts')
      .select('id, content, user_id, created_at, likes_count, comments_count, images')
      .ilike('content', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (user) query = query.neq('user_id', user.id);  // 👈 내 게시글 제외

    const { data: posts } = await query;

    if (posts?.length) {
      const userIds = [...new Set(posts.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles').select('id, username, display_name, avatar_url').in('id', userIds);
      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

      let likedSet = new Set<string>();
      if (user) {
        const { data: likes } = await supabase
          .from('post_likes').select('post_id')
          .eq('user_id', user.id).in('post_id', posts.map(p => p.id));
        likedSet = new Set((likes ?? []).map(l => l.post_id));
      }

      results.posts = posts.map(p => ({
        ...p, profile: profileMap[p.user_id] ?? null, is_liked: likedSet.has(p.id),
      }));
    }
  }

  // ── 스토리 검색 (익명이라 작성자 필터 없음)
  if (type === 'all' || type === 'stories') {
    const { data: byContent } = await supabase
      .from('stories')
      .select('id, content, anonymous_name, emotion_tags, created_at, likes_count, comments_count')
      .eq('is_public', true)
      .ilike('content', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(8);

    const { data: byTag } = await supabase
      .from('stories')
      .select('id, content, anonymous_name, emotion_tags, created_at, likes_count, comments_count')
      .eq('is_public', true)
      .contains('emotion_tags', [q])
      .order('created_at', { ascending: false })
      .limit(8);

    const merged = [...(byContent ?? []), ...(byTag ?? [])];
    const seen   = new Set<string>();
    results.stories = merged.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    }).slice(0, 10);
  }

  return NextResponse.json(results);
}