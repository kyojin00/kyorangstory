// src/app/api/penpal/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/* GET /api/penpal
   내 펜팔 상태 반환: null | { status: 'waiting' } | { status: 'matched', ...match } */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 대기 중인 신청 확인
  const { data: waiting } = await supabase
    .from('penpal_requests')
    .select('id, alias, emotions, created_at')
    .eq('user_id', user.id)
    .eq('status', 'waiting')
    .maybeSingle();

  if (waiting) return NextResponse.json({ status: 'waiting', ...waiting });

  // 매칭된 페어 확인 (user1 또는 user2)
  const { data: match } = await supabase
    .from('penpal_matches')
    .select(`
      id, matched_at, status,
      user1_id, user1_alias, user1_emotions,
      user2_id, user2_alias, user2_emotions
    `)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq('status', 'active')
    .maybeSingle();

  if (!match) return NextResponse.json(null);

  const isUser1 = match.user1_id === user.id;
  const partnerAlias   = isUser1 ? match.user2_alias   : match.user1_alias;
  const partnerEmotion = isUser1
    ? (match.user2_emotions?.[0] ?? '')
    : (match.user1_emotions?.[0] ?? '');

  // 편지 목록
  const { data: letters } = await supabase
    .from('penpal_letters')
    .select('id, content, sender_id, created_at, is_read')
    .eq('match_id', match.id)
    .order('created_at', { ascending: true });

  const formattedLetters = (letters ?? []).map(l => ({
    ...l,
    from_alias: l.sender_id === user.id ? '나' : partnerAlias,
  }));

  // 읽지 않은 편지 읽음 처리
  const unreadIds = (letters ?? [])
    .filter(l => l.sender_id !== user.id && !l.is_read)
    .map(l => l.id);

  if (unreadIds.length > 0) {
    await supabase.from('penpal_letters').update({ is_read: true }).in('id', unreadIds);
  }

  return NextResponse.json({
    status:          'matched',
    id:              match.id,
    matched_at:      match.matched_at,
    partner_alias:   partnerAlias,
    partner_emotion: partnerEmotion,
    letters:         formattedLetters,
  });
}

/* POST /api/penpal
   펜팔 신청 + 자동 매칭 시도 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { alias, emotions } = await req.json();
  if (!alias?.trim() || !emotions?.length)
    return NextResponse.json({ error: '별명과 감정을 선택해주세요' }, { status: 400 });

  // 이미 대기/매칭 중인지 확인
  const { data: existing } = await supabase
    .from('penpal_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'waiting')
    .maybeSingle();
  if (existing) return NextResponse.json({ error: '이미 대기 중이에요' }, { status: 409 });

  const { data: matched } = await supabase
    .from('penpal_matches')
    .select('id')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq('status', 'active')
    .maybeSingle();
  if (matched) return NextResponse.json({ error: '이미 진행 중인 펜팔이 있어요' }, { status: 409 });

  // 매칭 가능한 대기자 탐색 (감정 겹치는 사람 우선)
  const { data: candidates } = await supabase
    .from('penpal_requests')
    .select('id, user_id, alias, emotions')
    .eq('status', 'waiting')
    .neq('user_id', user.id)
    .limit(20);

  let partner = null;
  if (candidates?.length) {
    // 감정 겹치는 수로 정렬
    const scored = candidates.map(c => ({
      ...c,
      score: (c.emotions as string[]).filter((e: string) => emotions.includes(e)).length,
    }));
    scored.sort((a, b) => b.score - a.score);
    partner = scored[0];
  }

  if (partner) {
    // 즉시 매칭
    await supabase.from('penpal_matches').insert({
      user1_id:       user.id,
      user1_alias:    alias.trim(),
      user1_emotions: emotions,
      user2_id:       partner.user_id,
      user2_alias:    partner.alias,
      user2_emotions: partner.emotions,
      status:         'active',
      matched_at:     new Date().toISOString(),
    });
    await supabase.from('penpal_requests').update({ status: 'matched' }).eq('id', partner.id);
    return NextResponse.json({ status: 'matched' });
  }

  // 매칭 실패 → 대기 등록
  await supabase.from('penpal_requests').insert({
    user_id:  user.id,
    alias:    alias.trim(),
    emotions,
    status:   'waiting',
  });
  return NextResponse.json({ status: 'waiting' });
}