'use client';

// src/app/story/page.tsx

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import {
  Story, EmotionTag, ReactionType,
  EMOTION_LIST, EMOTION_COLOR, REACTION_ICON,
} from '@/types/story.types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function StoryRightPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* 털어놓기 배너 */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0a2e, #0f0820)',
        border: '1px solid #4c1d9555',
        borderRadius: '16px', padding: '20px',
      }}>
        <p style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#a78bfa' }}>
          🌙 익명 피드
        </p>
        <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.65 }}>
          여기선 아무도 당신을 판단하지 않아요.<br />
          익명으로 마음을 편하게 털어놓으세요.
        </p>
        <Link href="/story/write" style={{
          display: 'inline-block', background: '#7c3aed', color: '#fff',
          borderRadius: '20px', padding: '8px 18px',
          fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
        }}>
          ✏️ 털어놓기
        </Link>
      </div>

      {/* 감정 필터 */}
      <div style={{
        background: '#0f0f1f', border: '1px solid #1e1b3a',
        borderRadius: '16px', padding: '16px',
      }}>
        <p style={{ margin: '0 0 12px', fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
          감정으로 찾기
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {EMOTION_LIST.map(e => (
            <Link
              key={e}
              href={`/story?emotion=${e}`}
              style={{
                fontSize: '0.78rem', padding: '4px 10px', borderRadius: '12px',
                background: EMOTION_COLOR[e] + '22', color: EMOTION_COLOR[e],
                border: `1px solid ${EMOTION_COLOR[e]}44`, textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              {e}
            </Link>
          ))}
        </div>
      </div>

      {/* 이용 안내 */}
      <div style={{
        background: '#0f0f1f', border: '1px solid #1e1b3a',
        borderRadius: '16px', padding: '16px',
      }}>
        <p style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>이용 안내</p>
        {[
          '🔒 완전 익명으로 작성돼요',
          '💜 판단 없는 공감 공간이에요',
          '💬 따뜻한 댓글로 위로해줄 수 있어요',
        ].map(t => (
          <p key={t} style={{ margin: '0 0 6px', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>{t}</p>
        ))}
      </div>

      <p style={{ fontSize: '0.7rem', color: '#1e1b3a', textAlign: 'center' }}>© 2025 교랑 스토리</p>
    </div>
  );
}

export default function StoryFeedPage() {
  const [stories,  setStories]  = useState<Story[]>([]);
  const [selected, setSelected] = useState<EmotionTag | null>(null);
  const [loading,  setLoading]  = useState(true);

  const fetchStories = useCallback(async (emotion: EmotionTag | null) => {
    setLoading(true);
    const url  = emotion ? `/api/stories?emotion=${emotion}` : '/api/stories';
    const res  = await fetch(url);
    const data = await res.json();
    setStories(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStories(selected); }, [selected, fetchStories]);

  const handleReaction = async (storyId: string, type: ReactionType) => {
    await fetch(`/api/stories/${storyId}/reactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction_type: type }),
    });
    fetchStories(selected);
  };

  return (
    <SidebarLayout rightPanel={<StoryRightPanel />}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{
          borderBottom: '1px solid #1e1b3a', padding: '18px 20px',
          position: 'sticky', top: 0, background: '#080810', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#a78bfa' }}>
            🌙 익명 피드
          </h1>
          <Link href="/story/write" style={{
            background: '#7c3aed', color: '#fff', borderRadius: '20px',
            padding: '7px 18px', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
          }}>
            ✏️ 털어놓기
          </Link>
        </div>

        {/* 감정 필터 탭 */}
        <div style={{
          padding: '12px 20px', display: 'flex', gap: '6px',
          overflowX: 'auto', scrollbarWidth: 'none',
          borderBottom: '1px solid #1e1b3a',
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{
              flexShrink: 0, padding: '5px 14px', borderRadius: '20px',
              border: 'none', cursor: 'pointer', fontSize: '0.82rem',
              fontWeight: selected === null ? 700 : 500,
              background: selected === null ? '#7c3aed' : '#1e1b3a',
              color: selected === null ? '#fff' : '#94a3b8',
              transition: 'all 0.15s',
            }}
          >
            전체
          </button>
          {EMOTION_LIST.map(e => (
            <button
              key={e}
              onClick={() => setSelected(prev => prev === e ? null : e)}
              style={{
                flexShrink: 0, padding: '5px 14px', borderRadius: '20px',
                border: 'none', cursor: 'pointer', fontSize: '0.82rem',
                fontWeight: selected === e ? 700 : 500,
                background: selected === e ? EMOTION_COLOR[e] : '#1e1b3a',
                color: selected === e ? '#fff' : '#94a3b8',
                transition: 'all 0.15s',
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {/* 피드 */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>불러오는 중...</p>
        ) : stories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#334155' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 12px' }}>🌙</p>
            <p style={{ fontSize: '0.9rem' }}>아직 글이 없어요. 첫 번째로 털어놔 보세요 💜</p>
          </div>
        ) : stories.map(story => (
          <div
            key={story.id}
            style={{ padding: '18px 20px', borderBottom: '1px solid #1e1b3a', transition: 'background 0.1s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0a0a16'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {/* 작성자 + 시간 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #7c3aed44, #4c1d9444)',
                  border: '1px solid #7c3aed55',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                }}>
                  🌙
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#a78bfa' }}>
                  {story.anonymous_name}
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#334155' }}>
                {timeAgo(story.created_at)}
              </span>
            </div>

            {/* 감정 태그 */}
            {story.emotion_tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {story.emotion_tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px',
                    background: EMOTION_COLOR[tag] + '22', color: EMOTION_COLOR[tag],
                    border: `1px solid ${EMOTION_COLOR[tag]}44`,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 본문 */}
            <Link href={`/story/${story.id}`} style={{ textDecoration: 'none' }}>
              <p style={{
                margin: '0 0 14px', fontSize: '0.95rem', lineHeight: 1.75,
                color: '#cbd5e1', cursor: 'pointer', whiteSpace: 'pre-wrap',
                display: '-webkit-box', WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {story.content}
              </p>
            </Link>

            {/* 반응 버튼 */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {(['heart', 'hug', 'cry', 'cheer', 'same'] as ReactionType[]).map(type => {
                const active = story.user_reaction === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleReaction(story.id, type)}
                    style={{
                      background: active ? '#7c3aed22' : 'transparent',
                      border: active ? '1px solid #7c3aed' : '1px solid #2d2b4a',
                      borderRadius: '20px', padding: '5px 12px', cursor: 'pointer',
                      fontSize: '0.875rem', color: '#94a3b8',
                      transition: 'all 0.15s',
                      transform: active ? 'scale(1.05)' : 'scale(1)',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed77'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = '#2d2b4a'; }}
                  >
                    {REACTION_ICON[type]}
                  </button>
                );
              })}
              <Link
                href={`/story/${story.id}`}
                style={{
                  marginLeft: 'auto', fontSize: '0.82rem', color: '#475569',
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#7c3aed'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}
              >
                💬 {story.comments_count}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </SidebarLayout>
  );
}