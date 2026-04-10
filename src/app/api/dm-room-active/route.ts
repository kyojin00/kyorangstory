// src/app/api/dm-room-active/route.ts
// DM 채팅방 접속/퇴장 등록

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/dm-room-active  →  채팅방 입장 (30초마다 갱신)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { partner_id } = await req.json();
  if (!partner_id) return NextResponse.json({ error: 'partner_id 필요' }, { status: 400 });

  await supabase.from('active_dm_rooms').upsert({
    user_id:         user.id,
    room_partner_id: partner_id,
    updated_at:      new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return NextResponse.json({ ok: true });
}

// DELETE /api/dm-room-active  →  채팅방 퇴장
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  await supabase.from('active_dm_rooms').delete().eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}