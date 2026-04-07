// src/app/api/messages/[username]/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ username: string }> };

// GET /api/messages/:username  →  대화 내역
export async function GET(_: NextRequest, { params }: Params) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  // 상대방 프로필
  const { data: other } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('username', username)
    .maybeSingle();

  if (!other) return NextResponse.json({ error: '존재하지 않는 사용자' }, { status: 404 });

  // 대화 내역
  const { data: messages } = await supabase
    .from('direct_messages')
    .select('*')
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${other.id}),` +
      `and(sender_id.eq.${other.id},receiver_id.eq.${user.id})`
    )
    .order('created_at', { ascending: true });

  // 읽음 처리
  await supabase
    .from('direct_messages')
    .update({ is_read: true })
    .eq('sender_id', other.id)
    .eq('receiver_id', user.id)
    .eq('is_read', false);

  return NextResponse.json({ other, messages: messages ?? [] });
}

// POST /api/messages/:username  →  메시지 전송
export async function POST(req: NextRequest, { params }: Params) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: other } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (!other) return NextResponse.json({ error: '존재하지 않는 사용자' }, { status: 404 });

  const body = await req.json();
  const content: string = body?.content?.trim() ?? '';
  if (!content) return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({ sender_id: user.id, receiver_id: other.id, content })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}