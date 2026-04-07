// src/app/api/profile/[username]/followers/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ username: string }> };

// GET /api/profile/:username/followers  →  팔로워 목록
export async function GET(_: NextRequest, { params }: Params) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: target } = await supabase
    .from('profiles').select('id').eq('username', username).maybeSingle();
  if (!target) return NextResponse.json({ error: '없는 사용자' }, { status: 404 });

  const { data: follows } = await supabase
    .from('follows')
    .select('follower_id, status')
    .eq('following_id', target.id)
    .eq('status', 'accepted');

  if (!follows?.length) return NextResponse.json([]);

  const ids = follows.map(f => f.follower_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, followers_count')
    .in('id', ids);

  // 내가 팔로우 중인지 여부 병합
  let myFollowSet = new Set<string>();
  if (user) {
    const { data: myFollows } = await supabase
      .from('follows').select('following_id')
      .eq('follower_id', user.id).eq('status', 'accepted')
      .in('following_id', ids);
    myFollowSet = new Set((myFollows ?? []).map(f => f.following_id));
  }

  return NextResponse.json(
    (profiles ?? []).map(p => ({
      ...p,
      is_following: myFollowSet.has(p.id),
      is_me:        user?.id === p.id,
    }))
  );
}

// DELETE /api/profile/:username/followers  →  내 팔로워 제거
// body: { follower_username: string }
export async function DELETE(req: NextRequest, { params }: Params) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  // 본인 프로필에서만 가능
  const { data: me } = await supabase
    .from('profiles').select('id').eq('id', user.id).eq('username', username).maybeSingle();
  if (!me) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { follower_username } = await req.json();
  const { data: follower } = await supabase
    .from('profiles').select('id').eq('username', follower_username).maybeSingle();
  if (!follower) return NextResponse.json({ error: '없는 사용자' }, { status: 404 });

  await supabase.from('follows').delete()
    .eq('follower_id', follower.id)
    .eq('following_id', user.id);

  return NextResponse.json({ success: true });
}