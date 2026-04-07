// src/app/api/diary/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/diary?year=2025&month=4  →  해당 월 전체 조회
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year  = searchParams.get('year')  ?? new Date().getFullYear().toString();
  const month = searchParams.get('month') ?? String(new Date().getMonth() + 1).padStart(2, '0');

  const y    = parseInt(year);
  const m    = parseInt(month);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  // 다음달 1일의 하루 전 = 이번달 마지막 날
  const lastDay = new Date(y, m, 0).getDate();
  const to   = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('emotion_diary')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/diary  →  오늘 감정 저장 (upsert)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { emotion, note, date } = await req.json();
  if (!emotion) return NextResponse.json({ error: '감정을 선택해주세요' }, { status: 400 });

  const targetDate = date ?? new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('emotion_diary')
    .upsert(
      { user_id: user.id, date: targetDate, emotion, note: note?.trim() ?? '' },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/diary?date=2025-04-06  →  특정 날짜 삭제
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date 파라미터 필요' }, { status: 400 });

  const { error } = await supabase
    .from('emotion_diary')
    .delete()
    .eq('user_id', user.id)
    .eq('date', date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}