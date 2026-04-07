// src/app/api/stories/[id]/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

// PATCH → 스토리 수정
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: story } = await supabase
    .from('stories').select('user_id').eq('id', id).maybeSingle();
  if (!story)                    return NextResponse.json({ error: '없는 스토리' }, { status: 404 });
  if (story.user_id !== user.id) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const body    = await req.json();
  const content = body?.content?.trim() ?? '';
  if (!content) return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });

  const updates: Record<string, any> = { content };
  if (body.emotion_tags)   updates.emotion_tags   = body.emotion_tags;
  if (body.images)         updates.images         = body.images;

  const { data, error } = await supabase
    .from('stories').update(updates).eq('id', id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE → 스토리 삭제
export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: story } = await supabase
    .from('stories').select('user_id').eq('id', id).maybeSingle();
  if (!story)                    return NextResponse.json({ error: '없는 스토리' }, { status: 404 });
  if (story.user_id !== user.id) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  await supabase.from('stories').delete().eq('id', id);
  return NextResponse.json({ success: true });
}