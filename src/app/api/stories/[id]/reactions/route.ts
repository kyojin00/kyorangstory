import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const body = await req.json();
  const reaction_type: string = body?.reaction_type;

  if (!['heart', 'hug', 'cry', 'cheer', 'same'].includes(reaction_type)) {
    return NextResponse.json({ error: '유효하지 않은 반응입니다' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('story_reactions')
    .select('id, reaction_type')
    .eq('story_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  // 토글 OFF
  if (existing?.reaction_type === reaction_type) {
    await supabase.from('story_reactions').delete().eq('id', existing.id);
    return NextResponse.json({ action: 'removed', reaction_type: null });
  }

  // 교체
  if (existing) {
    await supabase.from('story_reactions').update({ reaction_type }).eq('id', existing.id);
    return NextResponse.json({ action: 'updated', reaction_type });
  }

  // 신규 추가
  await supabase
    .from('story_reactions')
    .insert({ story_id: id, user_id: user.id, reaction_type });

  return NextResponse.json({ action: 'added', reaction_type });
}