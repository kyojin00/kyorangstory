// src/app/api/messages/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/messages  →  내 DM 목록 (상대방별 최신 메시지)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  // 내가 주고받은 모든 메시지에서 상대방 추출
  const { data: messages } = await supabase
    .from('direct_messages')
    .select('*')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (!messages?.length) return NextResponse.json([]);

  // 상대방별 최신 메시지만 추출
  const roomMap = new Map<string, typeof messages[0]>();
  for (const msg of messages) {
    const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
    if (!roomMap.has(otherId)) roomMap.set(otherId, msg);
  }

  const otherIds = [...roomMap.keys()];

  // 상대방 프로필 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', otherIds);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  // 안읽은 메시지 수
  const { data: unreadList } = await supabase
    .from('direct_messages')
    .select('sender_id')
    .eq('receiver_id', user.id)
    .eq('is_read', false);

  const unreadCount = new Map<string, number>();
  for (const m of unreadList ?? []) {
    unreadCount.set(m.sender_id, (unreadCount.get(m.sender_id) ?? 0) + 1);
  }

  const rooms = otherIds.map(otherId => ({
    profile:      profileMap[otherId] ?? null,
    last_message: roomMap.get(otherId)!,
    unread:       unreadCount.get(otherId) ?? 0,
  })).filter(r => r.profile);

  return NextResponse.json(rooms);
}