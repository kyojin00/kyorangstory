// src/app/story/[id]/opengraph-image.tsx
// Next.js ImageResponse로 동적 OG 이미지 생성

import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const size    = { width: 1200, height: 630 };

export default async function Image({ params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: story } = await supabase
    .from('stories').select('content, anonymous_name, emotion_tags')
    .eq('id', params.id).maybeSingle();

  const content = story?.content?.slice(0, 100) ?? '익명의 이야기';
  const name    = story?.anonymous_name ?? '익명';
  const emotion = story?.emotion_tags?.[0] ?? '';

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #080810 0%, #130d24 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: '80px',
      }}>
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px' }}>🌙</div>
          <span style={{ color: '#a78bfa', fontSize: '28px', fontWeight: 900 }}>교랑 스토리</span>
        </div>

        {/* 감정 태그 */}
        {emotion && (
          <div style={{
            background: '#7c3aed33', border: '1px solid #7c3aed55',
            borderRadius: '20px', padding: '6px 16px',
            color: '#a78bfa', fontSize: '20px', marginBottom: '24px',
          }}>
            {emotion}
          </div>
        )}

        {/* 내용 */}
        <p style={{
          color: '#e2e8f0', fontSize: '36px', lineHeight: 1.6,
          fontWeight: 500, margin: '0 0 40px', maxWidth: '900px',
        }}>
          "{content}{content.length >= 100 ? '...' : ''}"
        </p>

        {/* 작성자 */}
        <p style={{ color: '#64748b', fontSize: '22px', margin: 0 }}>
          🌙 {name}
        </p>
      </div>
    ),
    { ...size }
  );
}