// src/app/api/blocks/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/blocks  →  내 차단 목록
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: blocks } = await supabase
    .from('blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false });

  if (!blocks?.length) return NextResponse.json([]);

  const ids = blocks.map(b => b.blocked_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', ids);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  return NextResponse.json(
    blocks.map(b => ({
      ...profileMap[b.blocked_id],
      blocked_at: b.created_at,
    })).filter(b => b.id)
  );
}