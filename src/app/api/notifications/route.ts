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

  // actor 프로필 조회
  const actorIds = [...new Set(notifs.map(n => n.actor_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', actorIds);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  return NextResponse.json(
    notifs.map(n => ({ ...n, actor: profileMap[n.actor_id] ?? null }))
  );
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

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

  await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id);
  return NextResponse.json({ success: true });
}