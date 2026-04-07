'use client';

// src/app/feed/page.tsx

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Post } from '@/types/profile';
import SidebarLayout from '@/components/SidebarLayout';
import ReportModal from '@/components/ReportModal';
import ImageUploader from '@/components/ImageUploader';
import EditPostModal from '@/components/EditPostModal';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function Avatar({ url, name, size = 40 }: { url?: string; name?: string; size?: number }) {
  const initial = (name ?? '?').charAt(0).toUpperCase();
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? ''} loading="lazy" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #E8956D, #D4724A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff' }}>
      {initial}
    </div>
  );
}

function ProfileLink({ username, children }: { username?: string; children: React.ReactNode }) {
  if (username) return <Link href={`/profile/${username}`} style={{ textDecoration: 'none' }}>{children}</Link>;
  return <>{children}</>;
}

function PostImages({ images }: { images?: string[] }) {
  if (!images?.length) return null;
  const count = images.length;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: count === 1 ? '1fr' : count === 3 ? '2fr 1fr' : 'repeat(2, 1fr)', gap: '3px', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
      {images.slice(0, 4).map((url, i) => (
        <div key={url} style={{ aspectRatio: count === 1 ? '16/9' : '1', gridRow: count === 3 && i === 0 ? 'span 2' : 'auto', position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {i === 3 && count > 4 && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem', fontWeight: 800 }}>
              +{count - 4}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RightPanel() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 검색 */}
      <Link href="/search" style={{ textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFF8F0', border: '1.5px solid #EDE8E0', borderRadius: '24px', padding: '10px 16px', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E8956D'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#EDE8E0'; }}
        >
          <span style={{ color: '#A8A29E' }}>🔍</span>
          <span style={{ color: '#A8A29E', fontSize: '0.875rem' }}>검색하기...</span>
        </div>
      </Link>

      {/* 익명 피드 배너 */}
      <div style={{ background: 'linear-gradient(135deg, #FFF4E8, #FDE8DC)', border: '1px solid rgba(232,149,109,0.2)', borderRadius: '16px', padding: '18px' }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 800, color: '#1C1917' }}>🌙 익명 피드</p>
        <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#78716C', lineHeight: 1.6 }}>판단 없이 마음을 털어놓는 공간</p>
        <Link href="/story/write" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #E8956D, #D4724A)', color: '#fff', borderRadius: '20px', padding: '7px 16px', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 8px rgba(232,149,109,0.3)' }}>
          털어놓기 →
        </Link>
      </div>

      {/* 바로가기 */}
      <div style={{ background: '#fff', border: '1px solid #EDE8E0', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>바로가기</p>
        {[
          { href: '/trending',       icon: '🔥', label: '트렌딩' },
          { href: '/diary',          icon: '📔', label: '감정 다이어리' },
          { href: '/ai-chat',        icon: '💭', label: '상담' },
          { href: '/kakao-analysis', icon: '🔍', label: '대화 분석' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#78716C', fontSize: '0.875rem', padding: '7px 8px', borderRadius: '8px', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFF8F0'; (e.currentTarget as HTMLElement).style.color = '#E8956D'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#78716C'; }}
          >
            <span>{item.icon}</span><span>{item.label}</span>
          </Link>
        ))}
      </div>
      <p style={{ fontSize: '0.68rem', color: '#D6D3D1', textAlign: 'center' }}>© 2025 교랑 스토리</p>
    </div>
  );
}

type FeedTab   = 'all' | 'following';
type LoadState = 'loading' | 'no-profile' | 'ready';
interface MyProfile { id: string; username: string; display_name: string; avatar_url: string }
const PAGE_SIZE = 15;

export default function FeedPage() {
  const [state,        setState]        = useState<LoadState>('loading');
  const [feedTab,      setFeedTab]      = useState<FeedTab>('all');
  const [posts,        setPosts]        = useState<Post[]>([]);
  const [postsLoad,    setPostsLoad]    = useState(true);
  const [hasMore,      setHasMore]      = useState(true);
  const [offset,       setOffset]       = useState(0);
  const [writing,      setWriting]      = useState(false);
  const [content,      setContent]      = useState('');
  const [images,       setImages]       = useState<string[]>([]);
  const [posting,      setPosting]      = useState(false);
  const [myProfile,    setMyProfile]    = useState<MyProfile | null>(null);
  const [menuOpen,     setMenuOpen]     = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [editTarget,   setEditTarget]   = useState<Post | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const router   = useRouter();
  const supabase = createClient();

  const fetchPosts = useCallback(async (tab: FeedTab, currentOffset: number, replace = false) => {
    setPostsLoad(true);
    const base = tab === 'following' ? '/api/posts?feed=following' : '/api/posts';
    const url  = `${base}${base.includes('?') ? '&' : '?'}offset=${currentOffset}`;
    const res  = await fetch(url);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    if (replace) setPosts(list);
    else setPosts(prev => [...prev, ...list]);
    setHasMore(list.length === PAGE_SIZE);
    setPostsLoad(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }
      const res  = await fetch('/api/profile');
      const data = await res.json();
      if (!data?.username) { setState('no-profile'); setTimeout(() => router.replace('/profile/setup'), 1500); return; }
      setMyProfile({ ...data, id: user.id });
      setState('ready');
      fetchPosts('all', 0, true);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !postsLoad) {
        const next = offset + PAGE_SIZE;
        setOffset(next);
        fetchPosts(feedTab, next);
      }
    }, { threshold: 0.1 });
    observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, postsLoad, offset, feedTab, fetchPosts]);

  const handleTabChange = (tab: FeedTab) => {
    setFeedTab(tab); setOffset(0); setHasMore(true);
    fetchPosts(tab, 0, true);
  };

  const handleLike = async (postId: string) => {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 } : p
    ));
  };

  const handlePost = async () => {
    if ((!content.trim() && !images.length) || posting) return;
    setPosting(true);
    const res  = await fetch('/api/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim(), images }),
    });
    const data = await res.json();
    if (res.ok) { setPosts(prev => [data, ...prev]); setContent(''); setImages([]); setWriting(false); }
    setPosting(false);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('게시글을 삭제할까요?')) return;
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) { setPosts(prev => prev.filter(p => p.id !== postId)); setMenuOpen(null); }
  };

  const handleBlock = async (username: string) => {
    if (!confirm(`@${username}을 차단할까요?`)) return;
    await fetch(`/api/block/${username}`, { method: 'POST' });
    setPosts(prev => prev.filter(p => p.profile?.username !== username));
    setMenuOpen(null);
  };

  if (state === 'loading') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #EDE8E0', borderTopColor: '#E8956D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (state === 'no-profile') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: '16px' }}>
      <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1C1917' }}>프로필 설정이 필요해요</p>
      <button onClick={() => router.replace('/profile/setup')} style={{ background: 'linear-gradient(135deg, #E8956D, #D4724A)', border: 'none', borderRadius: '12px', padding: '10px 24px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>지금 설정하기</button>
    </div>
  );

  return (
    <SidebarLayout rightPanel={<RightPanel />}>
      {reportTarget && <ReportModal targetType="post" targetId={reportTarget} onClose={() => setReportTarget(null)} />}
      {editTarget && (
        <EditPostModal postId={editTarget.id} content={editTarget.content} images={(editTarget as any).images ?? []}
          onSave={(newContent, newImages) => { setPosts(prev => prev.map(p => p.id === editTarget.id ? { ...p, content: newContent, images: newImages } : p)); }}
          onClose={() => setEditTarget(null)}
        />
      )}
      {menuOpen && <div onClick={() => setMenuOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}

      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* 헤더 + 탭 */}
        <div style={{ padding: '0 20px', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, borderBottom: '1px solid var(--border)' }}>
          <h1 style={{ margin: 0, padding: '18px 0 12px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>피드</h1>
          <div style={{ display: 'flex' }}>
            {([{ key: 'all', label: '전체' }, { key: 'following', label: '팔로잉' }] as { key: FeedTab; label: string }[]).map(t => (
              <button key={t.key} onClick={() => handleTabChange(t.key)} style={{
                flex: 1, padding: '11px', background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: feedTab === t.key ? 700 : 500,
                color: feedTab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: feedTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 글쓰기 */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Avatar url={myProfile!.avatar_url} name={myProfile!.display_name} size={42} />
            <div style={{ flex: 1 }}>
              {!writing ? (
                <button onClick={() => setWriting(true)} style={{
                  width: '100%', textAlign: 'left', background: '#FFF8F0', border: '1.5px solid #EDE8E0',
                  borderRadius: '24px', padding: '11px 18px', color: 'var(--text-muted)',
                  fontSize: '0.9rem', cursor: 'text', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E8956D'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#EDE8E0'; }}
                >
                  무슨 생각을 하고 있나요?
                </button>
              ) : (
                <div style={{ background: '#FFF8F0', border: '1.5px solid #E8956D', borderRadius: '16px', padding: '14px', boxShadow: '0 0 0 3px rgba(232,149,109,0.1)' }}>
                  <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="무슨 생각을 하고 있나요?" rows={3} autoFocus
                    style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: "'Noto Sans KR', sans-serif", lineHeight: 1.6 }}
                  />
                  <div style={{ margin: '10px 0 0' }}>
                    <ImageUploader bucket="post-images" images={images} onChange={setImages} maxCount={4} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #EDE8E0' }}>
                    <span style={{ fontSize: '0.75rem', color: content.length > 450 ? '#DC2626' : 'var(--text-muted)' }}>{content.length} / 500</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setWriting(false); setContent(''); setImages([]); }} style={{ background: 'transparent', border: '1.5px solid #EDE8E0', borderRadius: '20px', padding: '6px 16px', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#A8A29E'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#EDE8E0'; }}
                      >취소</button>
                      <button onClick={handlePost} disabled={(!content.trim() && !images.length) || posting} style={{
                        background: (content.trim() || images.length) && !posting ? 'linear-gradient(135deg, #E8956D, #D4724A)' : '#EDE8E0',
                        border: 'none', borderRadius: '20px', padding: '6px 20px',
                        color: (content.trim() || images.length) && !posting ? '#fff' : 'var(--text-muted)',
                        fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                        boxShadow: (content.trim() || images.length) && !posting ? '0 2px 8px rgba(232,149,109,0.3)' : 'none',
                        transition: 'all 0.15s',
                      }}>
                        {posting ? '게시 중...' : '게시'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 피드 */}
        {postsLoad && posts.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #EDE8E0', borderTopColor: '#E8956D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 12px' }}>{feedTab === 'following' ? '👥' : '📝'}</p>
            <p style={{ fontSize: '0.9rem', margin: '0 0 16px', color: 'var(--text-secondary)' }}>{feedTab === 'following' ? '팔로잉한 사람의 글이 없어요.' : '아직 게시글이 없어요.'}</p>
            {feedTab === 'following' && <Link href="/search" style={{ background: 'linear-gradient(135deg, #E8956D, #D4724A)', color: '#fff', borderRadius: '20px', padding: '8px 20px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700 }}>🔍 사람 찾기</Link>}
          </div>
        ) : (
          <>
            {posts.map(post => {
              const username = post.profile?.username;
              const dispName = post.profile?.display_name ?? '알 수 없음';
              const isMyPost = username === myProfile?.username;
              return (
                <div key={post.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', transition: 'background 0.1s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
                >
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <ProfileLink username={username}><Avatar url={post.profile?.avatar_url} name={dispName} size={42} /></ProfileLink>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <ProfileLink username={username}><span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{dispName}</span></ProfileLink>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{username ? `@${username}` : ''} · {timeAgo(post.created_at)}</span>
                        </div>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <button onClick={() => setMenuOpen(prev => prev === post.id ? null : post.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '2px 8px', borderRadius: '8px', transition: 'all 0.15s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EDE8E0'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >···</button>
                          {menuOpen === post.id && (
                            <div style={{ position: 'absolute', right: 0, top: '32px', background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', padding: '6px', zIndex: 50, minWidth: '150px', boxShadow: 'var(--shadow-lg)' }}>
                              {isMyPost ? (
                                <>
                                  <button onClick={() => { setEditTarget(post); setMenuOpen(null); }} style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px', transition: 'background 0.1s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFF8F0'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>✏️ 수정하기</button>
                                  <button onClick={() => handleDelete(post.id)} style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', color: '#DC2626', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px', transition: 'background 0.1s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>🗑️ 삭제하기</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setReportTarget(post.id); setMenuOpen(null); }} style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', color: '#D97706', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFFBEB'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>🚨 신고하기</button>
                                  {username && <button onClick={() => handleBlock(username)} style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', color: '#DC2626', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>🚫 차단하기</button>}
                                </>
                              )}
                              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                              <button onClick={() => { navigator.clipboard.writeText(`${location.origin}/feed/${post.id}`); setMenuOpen(null); }} style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>🔗 링크 복사</button>
                            </div>
                          )}
                        </div>
                      </div>

                      {post.content && (
                        <Link href={`/feed/${post.id}`} style={{ textDecoration: 'none' }}>
                          <p style={{ margin: '0 0 10px', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', cursor: 'pointer', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {post.content}
                          </p>
                        </Link>
                      )}

                      {(post as any).images?.length > 0 && (
                        <Link href={`/feed/${post.id}`} style={{ textDecoration: 'none' }}>
                          <PostImages images={(post as any).images} />
                        </Link>
                      )}

                      {/* 액션 버튼 */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button onClick={() => handleLike(post.id)} style={{
                          background: post.is_liked ? '#FDE8DC' : 'transparent',
                          border: post.is_liked ? '1px solid #E8956D' : '1px solid #EDE8E0',
                          borderRadius: '20px', padding: '5px 12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '5px',
                          color: post.is_liked ? '#D4724A' : 'var(--text-muted)',
                          fontSize: '0.82rem', fontWeight: post.is_liked ? 600 : 400,
                          transition: 'all 0.15s',
                        }}
                          onMouseEnter={e => { if (!post.is_liked) { (e.currentTarget as HTMLElement).style.background = '#FFF4E8'; (e.currentTarget as HTMLElement).style.borderColor = '#E8956D'; } }}
                          onMouseLeave={e => { if (!post.is_liked) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = '#EDE8E0'; } }}
                        >
                          {post.is_liked ? '❤️' : '🤍'} {post.likes_count}
                        </button>
                        <Link href={`/feed/${post.id}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'none', border: '1px solid #EDE8E0', borderRadius: '20px', padding: '5px 12px', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFF4E8'; (e.currentTarget as HTMLElement).style.borderColor = '#E8956D'; (e.currentTarget as HTMLElement).style.color = '#D4724A'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = '#EDE8E0'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                        >
                          💬 {post.comments_count}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 무한 스크롤 */}
            <div ref={loadMoreRef} style={{ padding: '20px', textAlign: 'center' }}>
              {postsLoad && <div style={{ width: 24, height: 24, border: '2px solid #EDE8E0', borderTopColor: '#E8956D', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />}
              {!hasMore && posts.length > 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>모든 게시글을 봤어요 ✨</p>}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </SidebarLayout>
  );
}