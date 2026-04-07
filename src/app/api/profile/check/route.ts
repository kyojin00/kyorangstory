// src/app/api/profile/check/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/profile/check?username=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username')?.toLowerCase().trim();

  if (!username) return NextResponse.json({ available: false });

  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  return NextResponse.json({ available: !data });
}