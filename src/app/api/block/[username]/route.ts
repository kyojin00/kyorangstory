// src/app/api/block/[username]/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ username: string }> };

// POST → 차단 토글
export async function POST(_: NextRequest, { params }: Params) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: target } = await supabase
    .from('profiles').select('id')
    .eq('username', username).maybeSingle();

  if (!target) return NextResponse.json({ error: '존재하지 않는 사용자' }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: '본인을 차단할 수 없어요' }, { status: 400 });

  const { data: existing } = await supabase
    .from('blocks').select('id')
    .eq('blocker_id', user.id).eq('blocked_id', target.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('blocks').delete().eq('id', existing.id);
    return NextResponse.json({ action: 'unblocked' });
  }

  // 차단 시 팔로우도 해제
  await supabase.from('follows').delete()
    .eq('follower_id', user.id).eq('following_id', target.id);
  await supabase.from('follows').delete()
    .eq('follower_id', target.id).eq('following_id', user.id);

  await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: target.id });
  return NextResponse.json({ action: 'blocked' });
}

// GET → 차단 여부 확인
export async function GET(_: NextRequest, { params }: Params) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ is_blocked: false });

  const { data: target } = await supabase
    .from('profiles').select('id')
    .eq('username', username).maybeSingle();

  if (!target) return NextResponse.json({ is_blocked: false });

  const { data } = await supabase.from('blocks').select('id')
    .eq('blocker_id', user.id).eq('blocked_id', target.id).maybeSingle();

  return NextResponse.json({ is_blocked: !!data });
}