// src/app/api/notifications/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/notifications  →  내 알림 목록
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: notifs, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!notifs?.length) return NextResponse.json([]);

  const actorIds = [...new Set(notifs.map(n => n.actor_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', actorIds);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
  return NextResponse.json(notifs.map(n => ({ ...n, actor: profileMap[n.actor_id] ?? null })));
}

// POST /api/notifications  →  알림 생성 (DM방 접속 중이면 생략)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { user_id, type, content, link, actor_id } = await req.json();
  if (!user_id || !type) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });

  // DM 알림이면 수신자가 현재 해당 채팅방에 있는지 확인
  if (type === 'dm') {
    const { data: activeRoom } = await supabase
      .from('active_dm_rooms')
      .select('room_partner_id, updated_at')
      .eq('user_id', user_id)
      .maybeSingle();

    if (activeRoom) {
      // 30초 이내 갱신된 경우만 "접속 중"으로 간주
      const lastSeen = new Date(activeRoom.updated_at).getTime();
      const isActive = Date.now() - lastSeen < 30_000;
      const isInThisRoom = activeRoom.room_partner_id === actor_id;

      if (isActive && isInThisRoom) {
        // 채팅방에 있으니 알림 생략
        return NextResponse.json({ skipped: true });
      }
    }
  }

  const { error } = await supabase.from('notifications').insert({
    user_id,
    type,
    content,
    link,
    actor_id,
    is_read: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH /api/notifications  →  전체 읽음 처리
export async function PATCH() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return NextResponse.json({ success: true });
}

// DELETE /api/notifications?id=xxx  →  단일 삭제
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

  await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id);
  return NextResponse.json({ success: true });
}