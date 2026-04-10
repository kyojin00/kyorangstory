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

/* ── 우측 패널 ── */
function StoryRightPanel() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* 배너 */}
      <div style={{
        borderRadius: '20px', padding: '22px',
        background: 'linear-gradient(140deg, #2d1b69 0%, #1a0f3d 100%)',
        border: '1px solid rgba(124,58,237,0.25)',
        boxShadow: '0 8px 32px rgba(124,58,237,0.12)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-20px', right: '-20px',
          width: '90px', height: '90px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <p style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em' }}>
          🌙 익명 피드
        </p>
        <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: '#7c6fa0', lineHeight: 1.7 }}>
          아무도 당신을 판단하지 않아요.<br />익명으로 마음을 털어놓으세요.
        </p>
        <Link href="/story/write" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: '#7c3aed', color: '#fff', borderRadius: '10px',
          padding: '8px 16px', fontSize: '0.78rem', fontWeight: 700,
          textDecoration: 'none', boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
        }}>
          ✏️ 털어놓기
        </Link>
      </div>

      {/* 감정 필터 */}
      <div style={{ borderRadius: '20px', padding: '18px', background: '#0d0d1f', border: '1px solid #1a1830' }}>
        <p style={{ margin: '0 0 12px', fontSize: '0.72rem', fontWeight: 700, color: '#2d2b50', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          감정으로 찾기
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {EMOTION_LIST.map(e => (
            <Link key={e} href={`/story?emotion=${e}`} style={{
              fontSize: '0.75rem', padding: '5px 11px', borderRadius: '10px',
              background: EMOTION_COLOR[e] + '15', color: EMOTION_COLOR[e],
              border: `1px solid ${EMOTION_COLOR[e]}30`,
              textDecoration: 'none', fontWeight: 600,
            }}>{e}</Link>
          ))}
        </div>
      </div>

      {/* 이용 안내 */}
      <div style={{ borderRadius: '20px', padding: '18px', background: '#0d0d1f', border: '1px solid #1a1830' }}>
        <p style={{ margin: '0 0 12px', fontSize: '0.72rem', fontWeight: 700, color: '#2d2b50', letterSpacing: '0.06em', textTransform: 'uppercase' }}>이용 안내</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { icon: '🔒', text: '완전 익명으로 작성돼요' },
            { icon: '💜', text: '판단 없는 공감 공간이에요' },
            { icon: '💬', text: '따뜻한 댓글로 위로해줄 수 있어요' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: '0.78rem', color: '#3d3660', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: '0.67rem', color: '#12112a', textAlign: 'center', marginTop: '4px' }}>© 2025 교랑 스토리</p>
    </div>
  );
}

/* ── 스켈레톤 ── */
function SkeletonCard() {
  return (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid #0f0f22' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#12112a', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: 80, height: 12, borderRadius: 6, background: '#12112a', marginBottom: 6 }} />
          <div style={{ width: 50, height: 10, borderRadius: 6, background: '#0e0e1f' }} />
        </div>
      </div>
      <div style={{ height: 12, borderRadius: 6, background: '#12112a', marginBottom: 7 }} />
      <div style={{ height: 12, borderRadius: 6, background: '#0e0e1f', width: '78%', marginBottom: 7 }} />
      <div style={{ height: 12, borderRadius: 6, background: '#0e0e1f', width: '56%' }} />
    </div>
  );
}

/* ── 반응 버튼 ── */
function ReactionButton({ type, active, onClick }: { type: ReactionType; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: active || hov ? 'rgba(124,58,237,0.14)' : '#0d0d1f',
        border: active ? '1.5px solid #7c3aed' : hov ? '1.5px solid #7c3aed66' : '1.5px solid #1a1830',
        borderRadius: '10px', padding: '6px 13px', cursor: 'pointer',
        fontSize: '0.9rem', color: '#94a3b8',
        transform: active ? 'scale(1.08)' : hov ? 'scale(1.04)' : 'scale(1)',
        transition: 'all 0.15s', fontFamily: 'inherit',
      }}
    >
      {REACTION_ICON[type]}
    </button>
  );
}

/* ── 댓글 링크 ── */
function CommentLink({ href, count }: { href: string; count: number }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        marginLeft: 'auto', fontSize: '0.8rem',
        color: hov ? '#a78bfa' : '#2d2b50',
        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px',
        padding: '6px 12px', borderRadius: '10px',
        border: `1.5px solid ${hov ? '#7c3aed44' : '#1a1830'}`,
        background: '#0d0d1f', fontWeight: 600, transition: 'all 0.15s',
      }}
    >
      💬 <span>{count}</span>
    </Link>
  );
}

/* ── 스토리 카드 ── */
function StoryCard({ story, onReaction }: { story: Story; onReaction: (id: string, type: ReactionType) => void }) {
  const [hov, setHov] = useState(false);
  return (
    <article
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '20px 24px', borderBottom: '1px solid #0f0f22',
        background: hov ? '#09091a' : 'transparent', transition: 'background 0.15s',
      }}
    >
      {/* 작성자 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #3b1f7a, #1a0f3d)',
          border: '1.5px solid #7c3aed33',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
        }}>🌙</div>
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#c4b5fd', letterSpacing: '-0.01em' }}>
            {story.anonymous_name}
          </p>
          <p suppressHydrationWarning style={{ margin: 0, fontSize: '0.7rem', color: '#2d2b50', marginTop: '1px' }}>
            {timeAgo(story.created_at)}
          </p>
        </div>
      </div>

      {/* 감정 태그 */}
      {story.emotion_tags.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {story.emotion_tags.map(tag => (
            <span key={tag} style={{
              fontSize: '0.7rem', padding: '3px 9px', borderRadius: '8px', fontWeight: 600,
              background: EMOTION_COLOR[tag] + '15', color: EMOTION_COLOR[tag],
              border: `1px solid ${EMOTION_COLOR[tag]}28`,
            }}>{tag}</span>
          ))}
        </div>
      )}

      {/* 본문 */}
      <Link href={`/story/${story.id}`} style={{ textDecoration: 'none' }}>
        <p style={{
          margin: '0 0 16px', fontSize: '0.92rem', lineHeight: 1.8,
          color: '#7c7a9a', cursor: 'pointer', whiteSpace: 'pre-wrap',
          display: '-webkit-box', WebkitLineClamp: 5,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
          letterSpacing: '-0.01em',
        }}>
          {story.content}
        </p>
      </Link>

      {/* 반응 + 댓글 */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {(['heart', 'hug', 'cry', 'cheer', 'same'] as ReactionType[]).map(type => (
          <ReactionButton
            key={type} type={type}
            active={story.user_reaction === type}
            onClick={() => onReaction(story.id, type)}
          />
        ))}
        <CommentLink href={`/story/${story.id}`} count={story.comments_count} />
      </div>
    </article>
  );
}

/* ── 감정 탭 버튼 ── */
function EmotionTab({
  label, color, isActive, onClick,
}: { label: string; color: string; isActive: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flexShrink: 0, padding: '6px 16px', borderRadius: '10px',
        border: 'none', cursor: 'pointer', fontSize: '0.8rem',
        fontWeight: isActive ? 700 : 500,
        background: isActive ? color : hov ? '#1a1830' : '#12112a',
        color: isActive ? '#fff' : hov ? '#7c6fa0' : '#3d3660',
        boxShadow: isActive ? `0 2px 14px ${color}55` : 'none',
        transition: 'all 0.18s', fontFamily: 'inherit',
      }}
    >{label}</button>
  );
}

/* ── 메인 ── */
export default function StoryFeedPage() {
  const [stories,  setStories]  = useState<Story[]>([]);
  const [selected, setSelected] = useState<EmotionTag | null>(null);
  const [loading,  setLoading]  = useState(true);

  const fetchStories = useCallback(async (emotion: EmotionTag | null) => {
    setLoading(true);
    const url = emotion ? `/api/stories?emotion=${emotion}` : '/api/stories';
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
      <div style={{ maxWidth: '660px', margin: '0 auto' }}>

        {/* ── 헤더 ── */}
        <div style={{
          padding: '14px 24px', position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(6,6,16,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #0f0f22',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em' }}>
              🌙 익명 피드
            </h1>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#2d2b50', marginTop: '2px' }}>판단 없는 익명 공간</p>
          </div>
          <Link
            href="/story/write"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
              color: '#fff', borderRadius: '12px', padding: '8px 18px',
              fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(-1px)';
              el.style.boxShadow = '0 8px 24px rgba(124,58,237,0.45)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'none';
              el.style.boxShadow = '0 4px 16px rgba(124,58,237,0.3)';
            }}
          >
            ✏️ 털어놓기
          </Link>
        </div>

        {/* ── 감정 필터 탭 ── */}
        <div style={{
          padding: '10px 20px', display: 'flex', gap: '6px',
          overflowX: 'auto', scrollbarWidth: 'none',
          borderBottom: '1px solid #0f0f22', background: '#06060f',
        }}>
          <EmotionTab
            label="전체" color="#7c3aed"
            isActive={selected === null}
            onClick={() => setSelected(null)}
          />
          {EMOTION_LIST.map(e => (
            <EmotionTab
              key={e} label={e} color={EMOTION_COLOR[e]}
              isActive={selected === e}
              onClick={() => setSelected(prev => prev === e ? null : e)}
            />
          ))}
        </div>

        {/* ── 피드 ── */}
        {loading ? (
          <>{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</>
        ) : stories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <p style={{ fontSize: '2.5rem', margin: '0 0 16px' }}>🌙</p>
            <p style={{ fontSize: '0.95rem', color: '#2d2b50', fontWeight: 600 }}>아직 글이 없어요</p>
            <p style={{ fontSize: '0.82rem', color: '#1e1c40', marginTop: '6px' }}>첫 번째로 마음을 털어놔 보세요 💜</p>
          </div>
        ) : stories.map(story => (
          <StoryCard key={story.id} story={story} onReaction={handleReaction} />
        ))}
      </div>
    </SidebarLayout>
  );
}