'use client';

// src/app/trending/page.tsx

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { EMOTION_COLOR, ReactionType, REACTION_ICON } from '@/types/story.types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function Avatar({ url, name, size = 36 }: { url?: string; name?: string; size?: number }) {
  const initial = (name ?? '?').charAt(0).toUpperCase();
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff',
    }}>
      {initial}
    </div>
  );
}

type TabType  = 'stories' | 'posts';
type Period   = 'day' | 'week';

export default function TrendingPage() {
  const [tab,     setTab]     = useState<TabType>('stories');
  const [period,  setPeriod]  = useState<Period>('day');
  const [items,   setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrending = async (t: TabType, p: Period) => {
    setLoading(true);
    const res  = await fetch(`/api/trending?type=${t}&period=${p}`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchTrending(tab, period); }, [tab, period]);

  const handleReaction = async (storyId: string, type: ReactionType) => {
    await fetch(`/api/stories/${storyId}/reactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction_type: type }),
    });
    fetchTrending(tab, period);
  };

  const handleLike = async (postId: string) => {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    setItems(prev => prev.map(p =>
      p.id === postId
        ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    ));
  };

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{
          borderBottom: '1px solid #1e1b3a', padding: '18px 20px',
          position: 'sticky', top: 0, background: '#080810', zIndex: 10,
        }}>
          <h1 style={{ margin: '0 0 14px', fontSize: '1.15rem', fontWeight: 800, color: '#e2e8f0' }}>
            🔥 트렌딩
          </h1>

          {/* 탭 */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
            {(['stories', 'posts'] as TabType[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: tab === t ? 700 : 500,
                background: tab === t ? '#7c3aed' : '#1e1b3a',
                color: tab === t ? '#fff' : '#94a3b8', transition: 'all 0.15s',
              }}>
                {t === 'stories' ? '🌙 스토리' : '📝 피드'}
              </button>
            ))}
          </div>

          {/* 기간 */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[{ key: 'day', label: '오늘' }, { key: 'week', label: '이번 주' }].map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key as Period)} style={{
                padding: '4px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: period === p.key ? 700 : 400,
                background: period === p.key ? '#1e1b3a' : 'transparent',
                color: period === p.key ? '#e2e8f0' : '#475569', transition: 'all 0.15s',
              }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 콘텐츠 */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>불러오는 중...</p>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#334155' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 12px' }}>🔥</p>
            <p style={{ fontSize: '0.9rem' }}>아직 트렌딩 글이 없어요</p>
          </div>
        ) : items.map((item, idx) => (
          <div
            key={item.id}
            style={{
              padding: '16px 20px', borderBottom: '1px solid #1e1b3a',
              transition: 'background 0.1s', position: 'relative',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0a0a16'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {/* 순위 뱃지 */}
            <div style={{
              position: 'absolute', top: '16px', right: '20px',
              fontSize: idx < 3 ? '1.4rem' : '0.8rem',
              color: idx < 3 ? undefined : '#334155',
              fontWeight: 800,
            }}>
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
            </div>

            {tab === 'stories' ? (
              // ── 스토리 아이템
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #7c3aed33, #4c1d9533)',
                    border: '1px solid #7c3aed44',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
                  }}>
                    🌙
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a78bfa' }}>
                      {item.anonymous_name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#334155', marginLeft: '8px' }}>
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                </div>

                {item.emotion_tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {item.emotion_tags.map((tag: string) => (
                      <span key={tag} style={{
                        fontSize: '0.7rem', padding: '2px 7px', borderRadius: '8px',
                        background: (EMOTION_COLOR as any)[tag] + '22',
                        color: (EMOTION_COLOR as any)[tag],
                        border: `1px solid ${(EMOTION_COLOR as any)[tag]}44`,
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <Link href={`/story/${item.id}`} style={{ textDecoration: 'none' }}>
                  <p style={{
                    margin: '0 0 12px', fontSize: '0.95rem', lineHeight: 1.7,
                    color: '#cbd5e1', cursor: 'pointer',
                    display: '-webkit-box', WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {item.content}
                  </p>
                </Link>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {(['heart', 'hug', 'cry'] as ReactionType[]).map(type => {
                    const active = item.user_reaction === type;
                    return (
                      <button key={type} onClick={() => handleReaction(item.id, type)} style={{
                        background: active ? '#7c3aed22' : 'transparent',
                        border: active ? '1px solid #7c3aed' : '1px solid #2d2b4a',
                        borderRadius: '20px', padding: '4px 10px', cursor: 'pointer',
                        fontSize: '0.82rem', color: '#94a3b8', transition: 'all 0.15s',
                      }}>
                        {REACTION_ICON[type]}
                      </button>
                    );
                  })}
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#475569' }}>
                    ❤️ {item.likes_count} · 💬 {item.comments_count}
                  </span>
                </div>
              </>
            ) : (
              // ── 피드 아이템
              <div style={{ display: 'flex', gap: '12px', paddingRight: '32px' }}>
                {item.profile?.username ? (
                  <Link href={`/profile/${item.profile.username}`}>
                    <Avatar url={item.profile?.avatar_url} name={item.profile?.display_name} size={40} />
                  </Link>
                ) : (
                  <Avatar name="?" size={40} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#e2e8f0' }}>
                      {item.profile?.display_name ?? '알 수 없음'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                      {item.profile?.username ? `@${item.profile.username}` : ''} · {timeAgo(item.created_at)}
                    </span>
                  </div>
                  <Link href={`/feed/${item.id}`} style={{ textDecoration: 'none' }}>
                    <p style={{
                      margin: '0 0 10px', fontSize: '0.95rem', lineHeight: 1.7,
                      color: '#cbd5e1', cursor: 'pointer',
                      display: '-webkit-box', WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {item.content}
                    </p>
                  </Link>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <button onClick={() => handleLike(item.id)} style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                      color: item.is_liked ? '#ef4444' : '#475569',
                      fontSize: '0.875rem', padding: 0, transition: 'color 0.15s',
                    }}>
                      {item.is_liked ? '❤️' : '🤍'} {item.likes_count}
                    </button>
                    <Link href={`/feed/${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontSize: '0.875rem', textDecoration: 'none' }}>
                      💬 {item.comments_count}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </SidebarLayout>
  );
}