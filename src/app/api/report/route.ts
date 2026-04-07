// src/app/api/report/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { target_type, target_id, reason, detail } = await req.json();

  if (!target_type || !target_id || !reason) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요' }, { status: 400 });
  }

  // 본인 신고 방지
  if (target_type === 'user' && target_id === user.id) {
    return NextResponse.json({ error: '본인을 신고할 수 없어요' }, { status: 400 });
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id, target_type, target_id,
    reason, detail: detail?.trim() ?? '',
  });

  // 중복 신고
  if (error?.code === '23505') {
    return NextResponse.json({ error: '이미 신고한 항목이에요' }, { status: 409 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true }, { status: 201 });
}