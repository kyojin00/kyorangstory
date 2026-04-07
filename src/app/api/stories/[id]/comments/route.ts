// src/app/api/stories/[id]/comments/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('story_comments')
    .select('*')
    .eq('story_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });

  const body = await req.json();
  const content: string   = body?.content?.trim() ?? '';
  const parent_id: string | null = body?.parent_id ?? null;

  if (!content) return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });

  const { data, error } = await supabase
    .from('story_comments')
    .insert({ story_id: id, user_id: user.id, content, parent_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}