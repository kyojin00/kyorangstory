// src/app/api/posts/[id]/like/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  // 기존 좋아요 확인
  const { data: existing } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('post_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // 좋아요 취소 - post_id + user_id로 삭제
    await supabase.from('post_likes').delete()
      .eq('post_id', id)
      .eq('user_id', user.id);
    return NextResponse.json({ action: 'unliked' });
  }

  // 좋아요 추가
  await supabase.from('post_likes').insert({ post_id: id, user_id: user.id });
  return NextResponse.json({ action: 'liked' });
}