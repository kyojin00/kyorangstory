// src/app/api/comfort/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/* GET /api/comfort?emotion=우울
   해당 감정의 랜덤 메시지 1개 반환 */
export async function GET(req: NextRequest) {
  const emotion = req.nextUrl.searchParams.get('emotion');
  if (!emotion) return NextResponse.json({ error: 'emotion required' }, { status: 400 });

  const supabase = await createClient();

  // 해당 감정 메시지 개수 파악 후 랜덤 offset
  const { count } = await supabase
    .from('comfort_messages')
    .select('*', { count: 'exact', head: true })
    .eq('emotion', emotion)
    .eq('is_approved', true);

  if (!count) return NextResponse.json(null);

  const offset = Math.floor(Math.random() * count);
  const { data, error } = await supabase
    .from('comfort_messages')
    .select('id, message, emotion, created_at')
    .eq('emotion', emotion)
    .eq('is_approved', true)
    .range(offset, offset)
    .single();

  if (error) return NextResponse.json(null);
  return NextResponse.json(data);
}

/* POST /api/comfort
   위로 메시지 등록 (익명, 관리자 승인 후 노출) */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { message, emotion } = await req.json();
  if (!message?.trim() || !emotion)
    return NextResponse.json({ error: '내용과 감정을 입력해주세요' }, { status: 400 });
  if (message.trim().length > 100)
    return NextResponse.json({ error: '100자 이내로 입력해주세요' }, { status: 400 });

  // 하루 5개 제한
  const today = new Date(); today.setHours(0,0,0,0);
  const { count } = await supabase
    .from('comfort_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', today.toISOString());

  if ((count ?? 0) >= 5)
    return NextResponse.json({ error: '하루 최대 5개까지 등록할 수 있어요' }, { status: 429 });

  const { error } = await supabase.from('comfort_messages').insert({
    user_id:     user.id,
    message:     message.trim(),
    emotion,
    is_approved: true, // 실서비스에서는 false로 바꾸고 관리자 승인 절차 추가
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}