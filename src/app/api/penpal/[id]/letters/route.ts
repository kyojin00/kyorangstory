// src/app/api/penpal/[id]/letters/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/* POST /api/penpal/[id]/letters
   편지 전송 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const matchId = params.id;
  const { content } = await req.json();
  if (!content?.trim())
    return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });
  if (content.trim().length > 1000)
    return NextResponse.json({ error: '1000자 이내로 입력해주세요' }, { status: 400 });

  // 내 매칭인지 확인
  const { data: match } = await supabase
    .from('penpal_matches')
    .select('id, user1_id, user2_id, status')
    .eq('id', matchId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq('status', 'active')
    .maybeSingle();

  if (!match) return NextResponse.json({ error: '매칭을 찾을 수 없어요' }, { status: 404 });

  // 하루 10통 제한
  const today = new Date(); today.setHours(0,0,0,0);
  const { count } = await supabase
    .from('penpal_letters')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId)
    .eq('sender_id', user.id)
    .gte('created_at', today.toISOString());

  if ((count ?? 0) >= 10)
    return NextResponse.json({ error: '하루 최대 10통까지 보낼 수 있어요' }, { status: 429 });

  const { data: letter, error } = await supabase
    .from('penpal_letters')
    .insert({
      match_id:  matchId,
      sender_id: user.id,
      content:   content.trim(),
      is_read:   false,
    })
    .select('id, content, sender_id, created_at, is_read')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 수신자 알림
  const receiverId = match.user1_id === user.id ? match.user2_id : match.user1_id;
  await supabase.from('notifications').insert({
    user_id:     receiverId,
    type:        'penpal_letter',
    content:     '펜팔로부터 새 편지가 도착했어요 💌',
    link:        '/penpal',
    is_read:     false,
  });

  return NextResponse.json(letter);
}