// src/app/api/posts/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_LIMIT = 15;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const limit  = parseInt(searchParams.get('limit')  ?? String(DEFAULT_LIMIT), 10);
  const userId = searchParams.get('user_id');
  const feed   = searchParams.get('feed');

  // 팔로잉 피드
  if (feed === 'following' && user) {
    const { data: follows } = await supabase
      .from('follows').select('following_id')
      .eq('follower_id', user.id).eq('status', 'accepted');

    const followingIds = (follows ?? []).map(f => f.following_id);
    if (!followingIds.length) return NextResponse.json([]);

    const { data: posts, error } = await supabase
      .from('posts').select('*')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!posts?.length) return NextResponse.json([]);

    return NextResponse.json(await mergeProfiles(supabase, user.id, posts));
  }

  // 전체 피드 / 유저 피드
  let query = supabase.from('posts').select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) query = query.eq('user_id', userId);

  const { data: posts, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!posts?.length) return NextResponse.json([]);

  return NextResponse.json(await mergeProfiles(supabase, user?.id ?? null, posts));
}

async function mergeProfiles(supabase: any, userId: string | null, posts: any[]) {
  const userIds = [...new Set(posts.map((p: any) => p.user_id))];
  const { data: profiles } = await supabase
    .from('profiles').select('id, username, display_name, avatar_url').in('id', userIds);
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

  let likedSet = new Set<string>();
  if (userId) {
    const { data: likes } = await supabase
      .from('post_likes').select('post_id')
      .eq('user_id', userId).in('post_id', posts.map((p: any) => p.id));
    likedSet = new Set((likes ?? []).map((l: any) => l.post_id));
  }

  return posts.map((p: any) => ({
    ...p,
    images:   p.images ?? [],
    profile:  profileMap[p.user_id] ?? null,
    is_liked: likedSet.has(p.id),
  }));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('id, username, display_name, avatar_url')
    .eq('id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: '프로필을 먼저 설정해주세요' }, { status: 403 });

  const body    = await req.json();
  const content = body?.content?.trim() ?? '';
  const images  = Array.isArray(body?.images) ? body.images.slice(0, 4) : [];

  if (!content && !images.length) {
    return NextResponse.json({ error: '내용 또는 이미지를 추가해주세요' }, { status: 400 });
  }

  const { data: post, error } = await supabase
    .from('posts').insert({ user_id: user.id, content, images }).select('*').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...post, profile, is_liked: false, images: post.images ?? [] }, { status: 201 });
}