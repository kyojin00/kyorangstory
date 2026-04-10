'use client';

// src/app/search/page.tsx

import { useEffect, useRef, useState } from 'react';
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
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #1a1830' }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: '#fff' }}>
      {(name ?? '?').charAt(0).toUpperCase()}
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
const SUGGESTIONS = ['행복', '연애', '직장', '가족', '외로움'];

export default function SearchPage() {
  const [query,    setQuery]    = useState('');
  const [tab,      setTab]      = useState<SearchTab>('all');
  const [results,  setResults]  = useState<{ users: any[]; posts: any[]; stories: any[] }>({ users: [], posts: [], stories: [] });
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [myId,     setMyId]     = useState<string | null>(null);  // 👈 내 ID 저장
  const inputRef = useRef<HTMLInputElement>(null);
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  // 마운트 시 내 ID 가져오기
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
    inputRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (q: string, currentTab = tab) => {
    if (!q.trim()) { setResults({ users: [], posts: [], stories: [] }); setSearched(false); return; }
    setLoading(true);
    const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${currentTab}`);
    const data = await res.json();

    // 👈 프론트에서도 나 자신 2차 필터링 (API 캐시 등 예외 대비)
    const filteredUsers = (data.users ?? []).filter((u: any) => u.id !== myId);
    const filteredPosts = (data.posts ?? []).filter((p: any) => p.user_id !== myId);

    setResults({ users: filteredUsers, posts: filteredPosts, stories: data.stories ?? [] });
    setSearched(true);
    setLoading(false);
  };

  const handleInput = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => handleSearch(value), 400);
  };

  const handleTabChange = (t: SearchTab) => {
    setTab(t);
    if (searched) handleSearch(query, t);
  };

  const totalCount = results.users.length + results.posts.length + results.stories.length;
  const showUsers   = tab === 'all' || tab === 'users';
  const showPosts   = tab === 'all' || tab === 'posts';
  const showStories = tab === 'all' || tab === 'stories';

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '660px', margin: '0 auto' }}>

        {/* ── 검색창 헤더 ── */}
        <div style={{
          padding: '14px 20px', position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(6,6,16,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #0f0f22',
        }}>
          {/* 검색 입력 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: '#0d0d1f', border: '1.5px solid #1a1830',
            borderRadius: '14px', padding: '10px 16px', marginBottom: '12px',
            transition: 'border-color 0.2s',
          }}
            onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed44'; }}
            onBlurCapture={e  => { (e.currentTarget as HTMLElement).style.borderColor = '#1a1830'; }}
          >
            <span style={{ color: '#2d2b50', fontSize: '0.95rem', flexShrink: 0 }}>🔎</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleInput(e.target.value)}
              placeholder="사람, 게시글, 감정태그 검색..."
              style={{
                flex: 1, background: 'transparent', border: 'none',
                color: '#c4b5fd', fontSize: '0.9rem', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults({ users: [], posts: [], stories: [] }); setSearched(false); }}
                style={{ background: '#12112a', border: 'none', color: '#3d3660', cursor: 'pointer', fontSize: '0.78rem', padding: '4px 8px', borderRadius: '8px', transition: 'all 0.15s', fontFamily: 'inherit' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#7c6fa0'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#3d3660'; }}
              >✕</button>
            )}
          </div>

          {/* 탭 */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => handleTabChange(t.key)} style={{
                padding: '6px 14px', borderRadius: '10px', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                background: tab === t.key ? '#7c3aed' : 'transparent',
                color: tab === t.key ? '#fff' : '#3d3660',
                fontSize: '0.8rem', fontWeight: tab === t.key ? 700 : 400,
                boxShadow: tab === t.key ? '0 2px 10px rgba(124,58,237,0.35)' : 'none',
                transition: 'all 0.15s',
              }}>
                {t.label}
                {searched && t.key !== 'all' && (
                  <span style={{ marginLeft: '5px', fontSize: '0.68rem', opacity: 0.75 }}>
                    {t.key === 'users' ? results.users.length
                   : t.key === 'posts' ? results.posts.length
                   : results.stories.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── 결과 ── */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '64px 0', color: '#2d2b50', fontSize: '0.84rem' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #1a1830', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
            <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
            검색 중...
          </div>
        ) : !searched ? (
          /* ── 초기 상태 ── */
          <div style={{ textAlign: 'center', padding: '72px 24px' }}>
            <div style={{ fontSize: '2.8rem', marginBottom: '14px' }}>🔍</div>
            <p style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 600, color: '#2d2b50' }}>사람, 게시글, 감정태그를 검색해보세요</p>
            <p style={{ margin: '0 0 24px', fontSize: '0.8rem', color: '#1e1c3a' }}>나 자신은 검색 결과에 나타나지 않아요</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {SUGGESTIONS.map(tag => (
                <button
                  key={tag}
                  onClick={() => { setQuery(tag); handleSearch(tag); }}
                  style={{
                    padding: '7px 16px', borderRadius: '12px',
                    border: '1px solid #1a1830', background: 'transparent',
                    color: '#3d3660', fontSize: '0.82rem', cursor: 'pointer',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#7c3aed44'; el.style.color = '#a78bfa'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1a1830'; el.style.color = '#3d3660'; }}
                >#{tag}</button>
              ))}
            </div>
          </div>
        ) : totalCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 24px' }}>
            <div style={{ fontSize: '2.8rem', marginBottom: '14px' }}>🤔</div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#2d2b50', fontWeight: 600 }}>
              &quot;{query}&quot; 검색 결과가 없어요
            </p>
          </div>
        ) : (
          <div>

            {/* 사람 */}
            {showUsers && results.users.length > 0 && (
              <section>
                {tab === 'all' && (
                  <div style={{ padding: '14px 20px 6px', borderBottom: '1px solid #0f0f22', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem' }}>👤</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2d2b50', letterSpacing: '0.04em' }}>사람</span>
                    <span style={{ fontSize: '0.72rem', color: '#1e1c3a', marginLeft: '2px' }}>{results.users.length}</span>
                  </div>
                )}
                {results.users.map(user => (
                  <UserRow key={user.id} user={user} />
                ))}
              </section>
            )}

            {/* 게시글 */}
            {showPosts && results.posts.length > 0 && (
              <section>
                {tab === 'all' && (
                  <div style={{ padding: '14px 20px 6px', borderBottom: '1px solid #0f0f22', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem' }}>📝</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2d2b50', letterSpacing: '0.04em' }}>게시글</span>
                    <span style={{ fontSize: '0.72rem', color: '#1e1c3a', marginLeft: '2px' }}>{results.posts.length}</span>
                  </div>
                )}
                {results.posts.map(post => (
                  <PostRow key={post.id} post={post} />
                ))}
              </section>
            )}

            {/* 스토리 */}
            {showStories && results.stories.length > 0 && (
              <section>
                {tab === 'all' && (
                  <div style={{ padding: '14px 20px 6px', borderBottom: '1px solid #0f0f22', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem' }}>🌙</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2d2b50', letterSpacing: '0.04em' }}>스토리</span>
                    <span style={{ fontSize: '0.72rem', color: '#1e1c3a', marginLeft: '2px' }}>{results.stories.length}</span>
                  </div>
                )}
                {results.stories.map(story => (
                  <StoryRow key={story.id} story={story} />
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

/* ── 유저 행 ── */
function UserRow({ user }: { user: any }) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={`/profile/${user.username}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid #0f0f22', background: hov ? '#09091a' : 'transparent', transition: 'background 0.15s' }}
      >
        <Avatar url={user.avatar_url} name={user.display_name} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.9rem', color: '#c4b5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.display_name}
          </p>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#2d2b50' }}>
            @{user.username} · 팔로워 {user.followers_count ?? 0}
          </p>
          {user.bio && (
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#3d3660', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.bio}
            </p>
          )}
        </div>
        <span style={{ fontSize: '0.75rem', color: '#1e1c3a', flexShrink: 0 }}>→</span>
      </div>
    </Link>
  );
}

/* ── 게시글 행 ── */
function PostRow({ post }: { post: any }) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={`/feed/${post.id}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ padding: '14px 20px', borderBottom: '1px solid #0f0f22', background: hov ? '#09091a' : 'transparent', transition: 'background 0.15s' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Avatar url={post.profile?.avatar_url} name={post.profile?.display_name} size={26} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7c6fa0' }}>{post.profile?.display_name ?? '알 수 없음'}</span>
          <span suppressHydrationWarning style={{ fontSize: '0.72rem', color: '#1e1c3a' }}>· {timeAgo(post.created_at)}</span>
        </div>
        <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#7c7a9a', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', letterSpacing: '-0.01em' }}>
          {post.content}
        </p>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.76rem', color: '#2d2b50' }}>
          <span>❤️ {post.likes_count}</span>
          <span>💬 {post.comments_count}</span>
        </div>
      </div>
    </Link>
  );
}

/* ── 스토리 행 ── */
function StoryRow({ story }: { story: any }) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={`/story/${story.id}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ padding: '14px 20px', borderBottom: '1px solid #0f0f22', background: hov ? '#09091a' : 'transparent', transition: 'background 0.15s' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a78bfa' }}>🌙 {story.anonymous_name}</span>
          <span suppressHydrationWarning style={{ fontSize: '0.72rem', color: '#1e1c3a' }}>· {timeAgo(story.created_at)}</span>
          {story.emotion_tags?.map((tag: string) => (
            <span key={tag} style={{
              fontSize: '0.68rem', padding: '2px 8px', borderRadius: '8px', fontWeight: 600,
              background: ((EMOTION_COLOR as any)[tag] ?? '#7c3aed') + '18',
              color: (EMOTION_COLOR as any)[tag] ?? '#a78bfa',
              border: `1px solid ${((EMOTION_COLOR as any)[tag] ?? '#7c3aed')}28`,
            }}>{tag}</span>
          ))}
        </div>
        <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#7c7a9a', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', letterSpacing: '-0.01em' }}>
          {story.content}
        </p>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.76rem', color: '#2d2b50' }}>
          <span>❤️ {story.likes_count}</span>
          <span>💬 {story.comments_count}</span>
        </div>
      </div>
    </Link>
  );
}