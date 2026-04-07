// src/app/api/posts/[id]/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/posts/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: post } = await supabase
    .from('posts').select('user_id').eq('id', id).maybeSingle();
  if (!post)            return NextResponse.json({ error: '없는 게시글' }, { status: 404 });
  if (post.user_id !== user.id) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const body    = await req.json();
  const content = body?.content?.trim() ?? '';
  const images  = Array.isArray(body?.images) ? body.images.slice(0, 4) : undefined;

  if (!content && (!images || images.length === 0)) {
    return NextResponse.json({ error: '내용 또는 이미지를 추가해주세요' }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (content !== undefined) updates.content = content;
  if (images  !== undefined) updates.images  = images;

  const { data, error } = await supabase
    .from('posts').update(updates).eq('id', id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/posts/:id
export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: post } = await supabase
    .from('posts').select('user_id').eq('id', id).maybeSingle();
  if (!post)            return NextResponse.json({ error: '없는 게시글' }, { status: 404 });
  if (post.user_id !== user.id) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  await supabase.from('posts').delete().eq('id', id);
  return NextResponse.json({ success: true });
}