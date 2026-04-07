// src/app/api/profile/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/profile  →  내 프로필 조회
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // username 없으면 프로필 미설정으로 간주
  if (!data || !data.username) return NextResponse.json(null);

  return NextResponse.json(data);
}

// POST /api/profile  →  프로필 username/display_name 설정
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { username, display_name, bio } = await req.json();

  if (!username?.trim() || !display_name?.trim()) {
    return NextResponse.json({ error: '아이디와 이름은 필수입니다' }, { status: 400 });
  }

  // username 중복 체크
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.trim().toLowerCase())
    .neq('id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: '이미 사용 중인 아이디예요' }, { status: 409 });
  }

  // upsert (이미 row가 있으므로 update)
  const { data, error } = await supabase
    .from('profiles')
    .update({
      username:     username.trim().toLowerCase(),
      display_name: display_name.trim(),
      bio:          bio?.trim() ?? '',
      avatar_url:   user.user_metadata?.avatar_url ?? null,
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/profile  →  프로필 수정
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, string> = {};

  if (body.display_name)      updates.display_name = body.display_name.trim();
  if (body.bio !== undefined)  updates.bio          = body.bio.trim();
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}