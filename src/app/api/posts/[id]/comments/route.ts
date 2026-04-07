// src/app/api/posts/[id]/comments/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/posts/:id/comments
export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: comments, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!comments?.length) return NextResponse.json([]);

  // 작성자 프로필 수동 조회
  const userIds = [...new Set(comments.map(c => c.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  return NextResponse.json(
    comments.map(c => ({ ...c, profile: profileMap[c.user_id] ?? null }))
  );
}

// POST /api/posts/:id/comments
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });

  const body = await req.json();
  const content: string = body?.content?.trim() ?? '';
  if (!content) return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: id, user_id: user.id, content })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 작성자 프로필 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({ ...data, profile }, { status: 201 });
}