// src/app/api/profile/[username]/follow/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ username: string }> };

// POST → 팔로우 요청 / 취소
export async function POST(_: NextRequest, { params }: Params) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  // 대상 유저 + 설정 조회
  const { data: target } = await supabase
    .from('profiles')
    .select('id, require_follow_approval')
    .eq('username', username)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: '존재하지 않는 사용자' }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: '본인은 팔로우할 수 없어요' }, { status: 400 });

  // 기존 follow row 확인
  const { data: existing } = await supabase
    .from('follows')
    .select('id, status')
    .eq('follower_id', user.id)
    .eq('following_id', target.id)
    .maybeSingle();

  // 이미 있으면 취소
  if (existing) {
    await supabase.from('follows').delete().eq('id', existing.id);
    await supabase.from('notifications')
      .delete()
      .eq('actor_id', user.id)
      .eq('user_id', target.id)
      .in('type', ['follow_request', 'follow']);

    return NextResponse.json({
      action: existing.status === 'pending' ? 'request_cancelled' : 'unfollowed',
    });
  }

  // 승인 필요 여부에 따라 status 결정
  const needsApproval = target.require_follow_approval === true;
  const status        = needsApproval ? 'pending' : 'accepted';

  const { data: follow } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: target.id, status })
    .select('id')
    .single();

  // 알림 생성
  await supabase.from('notifications').insert({
    user_id:     target.id,
    actor_id:    user.id,
    type:        needsApproval ? 'follow_request' : 'follow',
    target_id:   follow?.id,
    target_type: 'follow',
  });

  return NextResponse.json({
    action: needsApproval ? 'requested' : 'followed',
  });
}

// PATCH → 팔로우 요청 수락 / 거절
export async function PATCH(req: NextRequest, { params }: Params) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { action } = await req.json();

  const { data: requester } = await supabase
    .from('profiles').select('id')
    .eq('username', username).maybeSingle();

  if (!requester) return NextResponse.json({ error: '존재하지 않는 사용자' }, { status: 404 });

  const { data: follow } = await supabase
    .from('follows').select('id')
    .eq('follower_id', requester.id)
    .eq('following_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (!follow) return NextResponse.json({ error: '요청이 없어요' }, { status: 404 });

  if (action === 'accept') {
    await supabase.from('follows').update({ status: 'accepted' }).eq('id', follow.id);
    await supabase.from('notifications').insert({
      user_id: requester.id, actor_id: user.id,
      type: 'follow_accept', target_id: follow.id, target_type: 'follow',
    });
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('actor_id', requester.id)
      .eq('user_id', user.id)
      .eq('type', 'follow_request');
    return NextResponse.json({ action: 'accepted' });
  }

  await supabase.from('follows').delete().eq('id', follow.id);
  await supabase.from('notifications')
    .delete()
    .eq('actor_id', requester.id)
    .eq('user_id', user.id)
    .eq('type', 'follow_request');

  return NextResponse.json({ action: 'declined' });
}