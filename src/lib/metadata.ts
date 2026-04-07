// src/app/story/[id]/metadata.ts
// 이 파일은 story/[id]/page.tsx 상단에 추가하거나 별도 파일로 분리

import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

// generateMetadata를 page.tsx에 추가하면 됨
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: story } = await supabase
    .from('stories').select('content, anonymous_name, emotion_tags')
    .eq('id', id).maybeSingle();

  const content = story?.content?.slice(0, 100) ?? '익명의 이야기';
  const name    = story?.anonymous_name ?? '익명';
  const emotion = story?.emotion_tags?.[0] ? `[${story.emotion_tags[0]}] ` : '';
  const title   = `${emotion}${name}의 이야기 — 교랑 스토리`;

  return {
    title,
    description: content,
    openGraph: {
      title,
      description: content,
      type:        'article',
      siteName:    '교랑 스토리',
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description: content,
    },
  };
}

// feed/[id] 게시글 메타데이터
export async function generatePostMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: post } = await supabase
    .from('posts').select('content, user_id')
    .eq('id', id).maybeSingle();

  if (!post) return { title: '게시글 — 교랑 스토리' };

  const { data: profile } = await supabase
    .from('profiles').select('display_name')
    .eq('id', post.user_id).maybeSingle();

  const content = post.content?.slice(0, 100) ?? '';
  const author  = profile?.display_name ?? '누군가';
  const title   = `${author}의 게시글 — 교랑 스토리`;

  return {
    title,
    description: content,
    openGraph: { title, description: content, type: 'article', siteName: '교랑 스토리' },
    twitter:    { card: 'summary_large_image', title, description: content },
  };
}