'use client';

// src/app/search/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { EMOTION_COLOR } from '@/types/story.types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function Avatar({ url, name, size = 44 }: { url?: string; name?: string; size?: number }) {
  const initial = (name ?? '?').charAt(0).toUpperCase();
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff' }}>
      {initial}
    </div>
  );
}

type SearchTab = 'all' | 'users' | 'posts' | 'stories';

const TABS: { key: SearchTab; label: string }[] = [
  { key: 'all',     label: '전체' },
  { key: 'users',   label: '사람' },
  { key: 'posts',   label: '게시글' },
  { key: 'stories', label: '스토리' },
];

export default function SearchPage() {
  const [query,    setQuery]    = useState('');
  const [tab,      setTab]      = useState<SearchTab>('all');
  const [results,  setResults]  = useState<{ users: any[]; posts: any[]; stories: any[] }>({ users: [], posts: [], stories: [] });
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = async (q: string) => {
    if (!q.trim()) { setResults({ users: [], posts: [], stories: [] }); setSearched(false); return; }
    setLoading(true);
    const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${tab}`);
    const data = await res.json();
    setResults({ users: data.users ?? [], posts: data.posts ?? [], stories: data.stories ?? [] });
    setSearched(true);
    setLoading(false);
  };

  const handleInput = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => handleSearch(value), 400);
  };

  useEffect(() => { if (searched) handleSearch(query); }, [tab]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const totalCount = results.users.length + results.posts.length + results.stories.length;

  // 탭별 보여줄 결과
  const showUsers   = tab === 'all' || tab === 'users';
  const showPosts   = tab === 'all' || tab === 'posts';
  const showStories = tab === 'all' || tab === 'stories';

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '640px', margin: '0 auto', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        {/* 검색창 헤더 */}
        <div style={{ borderBottom: '1px solid #1e1b3a', padding: '14px 20px', position: 'sticky', top: 0, background: '#080810', zIndex: 10 }}>
          <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: '#0f0f1f', border: '1px solid #1e1b3a',
              borderRadius: '24px', padding: '10px 16px', marginBottom: '12px',
            }}>
            <span style={{ color: '#475569', fontSize: '1rem' }}>🔎</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleInput(e.target.value)}
              placeholder="사람, 게시글, 감정태그 검색..."
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none', fontFamily: 'sans-serif' }}
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults({ users: [], posts: [], stories: [] }); setSearched(false); }} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>✕</button>
            )}
          </div>

          {/* 탭 */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                background: tab === t.key ? '#7c3aed' : 'transparent',
                color: tab === t.key ? '#fff' : '#64748b',
                fontSize: '0.82rem', fontWeight: tab === t.key ? 700 : 400, transition: 'all 0.15s',
              }}>
                {t.label}
                {searched && t.key !== 'all' && (
                  <span style={{ marginLeft: '5px', fontSize: '0.7rem', opacity: 0.8 }}>
                    {t.key === 'users' ? results.users.length : t.key === 'posts' ? results.posts.length : results.stories.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 결과 */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>검색 중...</p>
        ) : !searched ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#334155' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 12px' }}>🔎</p>
            <p style={{ fontSize: '0.9rem' }}>사람, 게시글, 감정태그를 검색해보세요</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
              {['행복', '연애', '직장', '가족', '외로움'].map(tag => (
                <button key={tag} onClick={() => { setQuery(tag); handleSearch(tag); }} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid #1e1b3a', background: 'transparent', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1b3a'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        ) : totalCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#334155' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 12px' }}>🤔</p>
            <p style={{ fontSize: '0.9rem' }}>"{query}" 검색 결과가 없어요</p>
          </div>
        ) : (
          <div>
            {/* 사람 */}
            {showUsers && results.users.length > 0 && (
              <div>
                {tab === 'all' && (
                  <p style={{ margin: '0', padding: '12px 20px 8px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #1e1b3a' }}>
                    👤 사람 {results.users.length}
                  </p>
                )}
                {results.users.map(user => (
                  <Link key={user.id} href={`/profile/${user.username}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid #1e1b3a', transition: 'background 0.1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0a0a16'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <Avatar url={user.avatar_url} name={user.display_name} size={46} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.display_name}</p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>@{user.username} · 팔로워 {user.followers_count ?? 0}</p>
                        {user.bio && <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.bio}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* 게시글 */}
            {showPosts && results.posts.length > 0 && (
              <div>
                {tab === 'all' && (
                  <p style={{ margin: '0', padding: '12px 20px 8px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #1e1b3a' }}>
                    📝 게시글 {results.posts.length}
                  </p>
                )}
                {results.posts.map(post => (
                  <Link key={post.id} href={`/feed/${post.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e1b3a', transition: 'background 0.1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0a0a16'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <Avatar url={post.profile?.avatar_url} name={post.profile?.display_name} size={28} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8' }}>{post.profile?.display_name ?? '알 수 없음'}</span>
                        <span style={{ fontSize: '0.75rem', color: '#334155' }}>· {timeAgo(post.created_at)}</span>
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {post.content}
                      </p>
                      <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem', color: '#475569' }}>
                        <span>❤️ {post.likes_count}</span>
                        <span>💬 {post.comments_count}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* 스토리 */}
            {showStories && results.stories.length > 0 && (
              <div>
                {tab === 'all' && (
                  <p style={{ margin: '0', padding: '12px 20px 8px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #1e1b3a' }}>
                    🌙 스토리 {results.stories.length}
                  </p>
                )}
                {results.stories.map(story => (
                  <Link key={story.id} href={`/story/${story.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e1b3a', transition: 'background 0.1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0a0a16'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#a78bfa' }}>🌙 {story.anonymous_name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#334155' }}>· {timeAgo(story.created_at)}</span>
                        {story.emotion_tags?.map((tag: string) => (
                          <span key={tag} style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: '8px', background: (EMOTION_COLOR as any)[tag] + '22', color: (EMOTION_COLOR as any)[tag], border: `1px solid ${(EMOTION_COLOR as any)[tag]}44` }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {story.content}
                      </p>
                      <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem', color: '#475569' }}>
                        <span>❤️ {story.likes_count}</span>
                        <span>💬 {story.comments_count}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}