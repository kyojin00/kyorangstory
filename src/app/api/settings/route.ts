// src/app/api/settings/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/settings
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data, error } = await supabase
    .from('profiles')
    .select('require_follow_approval, is_private, show_activity')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? {
    require_follow_approval: false,
    is_private:              false,
    show_activity:           true,
  });
}

// PATCH /api/settings
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const body = await req.json();
  const allowed = ['require_follow_approval', 'is_private', 'show_activity'];
  const updates: Record<string, boolean> = {};

  for (const key of allowed) {
    if (typeof body[key] === 'boolean') updates[key] = body[key];
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: '변경할 설정이 없어요' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}