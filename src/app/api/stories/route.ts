import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// 랜덤 익명 이름 생성
function generateAnonymousName(): string {
  const names = [
    '밤하늘 별', '새벽 안개', '이름 없는 꽃', '조용한 파도',
    '달빛 아래서', '작은 새', '흘러가는 구름', '봄비 한 줄기',
    '멀리서 온 편지', '빈 의자', '늦은 밤 가로등', '젖은 모래',
    '기억 속의 향기', '첫눈 오던 날', '창가의 고양이', '잊혀진 노래',
  ];
  return names[Math.floor(Math.random() * names.length)];
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { searchParams } = new URL(req.url);
  const emotion = searchParams.get('emotion');
  const offset  = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('stories')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + 19);

  if (emotion) query = query.contains('emotion_tags', [emotion]);

  const { data: stories, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!stories?.length) return NextResponse.json([]);

  if (user) {
    const { data: reactions } = await supabase
      .from('story_reactions')
      .select('story_id, reaction_type')
      .eq('user_id', user.id)
      .in('story_id', stories.map(s => s.id));

    const reactionMap = Object.fromEntries(
      (reactions ?? []).map(r => [r.story_id, r.reaction_type])
    );
    return NextResponse.json(
      stories.map(s => ({ ...s, user_reaction: reactionMap[s.id] ?? null }))
    );
  }

  return NextResponse.json(stories);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });

  const body = await req.json();
  const content: string        = body?.content?.trim() ?? '';
  const emotion_tags: string[] = Array.isArray(body?.emotion_tags) ? body.emotion_tags : [];

  // 커스텀 이름 검증 (최대 20자, 비어있으면 랜덤 생성)
  const rawName      = body?.anonymous_name?.trim() ?? '';
  const anonymousName = rawName.length > 0
    ? rawName.slice(0, 20)
    : generateAnonymousName();

  if (!content) return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });

  const { data: story, error } = await supabase
    .from('stories')
    .insert({
      user_id:        user.id,
      content,
      emotion_tags,
      anonymous_name: anonymousName,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(story, { status: 201 });
}