'use client';

// src/app/feed/page.tsx

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getProfileCached } from '@/lib/profileCache';
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
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? ''} loading="lazy"
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #1a1830' }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff',
    }}>
      {(name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}

function PostImages({ images }: { images?: string[] }) {
  if (!images?.length) return null;
  const count = images.length;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: count === 1 ? '1fr' : count === 3 ? '2fr 1fr' : 'repeat(2, 1fr)',
      gap: '3px', borderRadius: '14px', overflow: 'hidden', marginBottom: '14px',
    }}>
      {images.slice(0, 4).map((url, i) => (
        <div key={url} style={{
          aspectRatio: count === 1 ? '16/9' : '1',
          gridRow: count === 3 && i === 0 ? 'span 2' : 'auto',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {i === 3 && count > 4 && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.4rem', fontWeight: 800 }}>
              +{count - 4}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── 우측 패널 ─── */
function RightPanel() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* 검색 */}
      <Link href="/search" style={{ textDecoration: 'none' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: '#0d0d1f', border: '1.5px solid #1a1830',
          borderRadius: '14px', padding: '11px 16px', transition: 'border-color 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed44'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a1830'; }}
        >
          <span style={{ color: '#2d2b50', fontSize: '0.9rem' }}>🔍</span>
          <span style={{ color: '#2d2b50', fontSize: '0.84rem' }}>검색하기...</span>
        </div>
      </Link>

      {/* 익명 피드 배너 */}
      <div style={{
        borderRadius: '20px', padding: '20px',
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
        <p style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em' }}>🌙 익명 피드</p>
        <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: '#7c6fa0', lineHeight: 1.7 }}>판단 없이 마음을 털어놓는 공간</p>
        <Link href="/story/write" style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: '#7c3aed', color: '#fff', borderRadius: '10px',
          padding: '7px 16px', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
        }}>털어놓기 →</Link>
      </div>

      {/* 바로가기 */}
      <div style={{ borderRadius: '20px', padding: '18px', background: '#0d0d1f', border: '1px solid #1a1830' }}>
        <p style={{ margin: '0 0 12px', fontSize: '0.72rem', fontWeight: 700, color: '#2d2b50', letterSpacing: '0.06em', textTransform: 'uppercase' }}>바로가기</p>
        {[
          { href: '/trending',       icon: '🔥', label: '트렌딩' },
          { href: '/diary',          icon: '📔', label: '감정 다이어리' },
          { href: '/ai-chat',        icon: '💭', label: '상담' },
          { href: '/kakao-analysis', icon: '🔍', label: '대화 분석' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            textDecoration: 'none', color: '#3d3660', fontSize: '0.85rem',
            padding: '8px 4px', borderRadius: '8px', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#a78bfa'; el.style.paddingLeft = '8px'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#3d3660'; el.style.paddingLeft = '4px'; }}
          >
            <span style={{ fontSize: '0.95rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── 스켈레톤 ─── */
function SkeletonPost() {
  return (
    <div style={{ padding: '18px 24px', borderBottom: '1px solid #0f0f22' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#12112a', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: 80, height: 12, borderRadius: 6, background: '#12112a' }} />
            <div style={{ width: 50, height: 12, borderRadius: 6, background: '#0e0e1f' }} />
          </div>
          <div style={{ height: 12, borderRadius: 6, background: '#12112a', marginBottom: 6 }} />
          <div style={{ height: 12, borderRadius: 6, background: '#0e0e1f', width: '80%', marginBottom: 6 }} />
          <div style={{ height: 12, borderRadius: 6, background: '#0e0e1f', width: '60%' }} />
        </div>
      </div>
    </div>
  );
}

/* ─── 드롭다운 메뉴 아이템 ─── */
function MenuItem({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', padding: '8px 14px', background: hov ? '#12112a' : 'transparent',
        border: 'none', color, fontSize: '0.84rem', cursor: 'pointer',
        textAlign: 'left', borderRadius: '8px', transition: 'background 0.12s',
        fontFamily: 'inherit',
      }}
    >{children}</button>
  );
}

/* ─── 포스트 카드 ─── */
function PostCard({
  post, isMyPost, onLike, onEdit, onDelete, onReport, onBlock, onCopy,
  menuOpen, setMenuOpen,
}: {
  post: Post; isMyPost: boolean;
  onLike: () => void; onEdit: () => void; onDelete: () => void;
  onReport: () => void; onBlock: () => void; onCopy: () => void;
  menuOpen: boolean; setMenuOpen: (v: boolean) => void;
}) {
  const [hov, setHov] = useState(false);
  const username = post.profile?.username;
  const dispName = post.profile?.display_name ?? '알 수 없음';

  return (
    <article
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '18px 24px', borderBottom: '1px solid #0f0f22',
        background: hov ? '#09091a' : 'transparent', transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* 아바타 */}
        {username
          ? <Link href={`/profile/${username}`}><Avatar url={post.profile?.avatar_url} name={dispName} size={42} /></Link>
          : <Avatar url={post.profile?.avatar_url} name={dispName} size={42} />
        }

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div>
              {username
                ? <Link href={`/profile/${username}`} style={{ textDecoration: 'none' }}><span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#c4b5fd' }}>{dispName}</span></Link>
                : <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#c4b5fd' }}>{dispName}</span>
              }
              <span style={{ fontSize: '0.78rem', color: '#2d2b50', marginLeft: '6px' }}>
                {username ? `@${username}` : ''} · <span suppressHydrationWarning>{timeAgo(post.created_at)}</span>
              </span>
            </div>

            {/* 메뉴 */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  background: menuOpen ? '#12112a' : 'transparent', border: 'none',
                  color: '#2d2b50', cursor: 'pointer', fontSize: '0.9rem',
                  padding: '4px 8px', borderRadius: '8px', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#12112a'; (e.currentTarget as HTMLElement).style.color = '#7c6fa0'; }}
                onMouseLeave={e => { if (!menuOpen) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#2d2b50'; } }}
              >···</button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '32px',
                  background: '#0c0c1e', border: '1px solid #1a1830',
                  borderRadius: '14px', padding: '6px', zIndex: 50,
                  minWidth: '148px', boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                }}>
                  {isMyPost ? (
                    <>
                      <MenuItem onClick={onEdit}   color="#c4b5fd">✏️ 수정하기</MenuItem>
                      <MenuItem onClick={onDelete} color="#f87171">🗑️ 삭제하기</MenuItem>
                    </>
                  ) : (
                    <>
                      <MenuItem onClick={onReport} color="#fb923c">🚨 신고하기</MenuItem>
                      {username && <MenuItem onClick={onBlock} color="#f87171">🚫 차단하기</MenuItem>}
                    </>
                  )}
                  <div style={{ height: '1px', background: '#12112a', margin: '4px 6px' }} />
                  <MenuItem onClick={onCopy} color="#4a5568">🔗 링크 복사</MenuItem>
                </div>
              )}
            </div>
          </div>

          {/* 본문 */}
          {post.content && (
            <Link href={`/feed/${post.id}`} style={{ textDecoration: 'none' }}>
              <p style={{
                margin: '0 0 12px', fontSize: '0.92rem', lineHeight: 1.8,
                color: '#94a3b8', whiteSpace: 'pre-wrap', cursor: 'pointer',
                display: '-webkit-box', WebkitLineClamp: 6,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                letterSpacing: '-0.01em',
              }}>
                {post.content}
              </p>
            </Link>
          )}

          {/* 이미지 */}
          {(post as any).images?.length > 0 && (
            <Link href={`/feed/${post.id}`} style={{ textDecoration: 'none' }}>
              <PostImages images={(post as any).images} />
            </Link>
          )}

          {/* 액션 */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <LikeButton liked={!!post.is_liked} count={post.likes_count} onClick={onLike} />
            <CommentButton href={`/feed/${post.id}`} count={post.comments_count} />
          </div>
        </div>
      </div>
    </article>
  );
}

function LikeButton({ liked, count, onClick }: { liked: boolean; count: number; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: liked || hov ? 'rgba(239,68,68,0.1)' : 'transparent',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '6px',
        color: liked ? '#f87171' : hov ? '#f87171' : '#2d2b50',
        fontSize: '0.82rem', padding: '6px 12px', borderRadius: '10px',
        transition: 'all 0.15s', fontFamily: 'inherit',
      }}
    >
      {liked ? '❤️' : '🤍'} <span style={{ fontWeight: liked ? 700 : 400 }}>{count}</span>
    </button>
  );
}

function CommentButton({ href, count }: { href: string; count: number }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        color: hov ? '#a78bfa' : '#2d2b50', fontSize: '0.82rem',
        textDecoration: 'none', padding: '6px 12px', borderRadius: '10px',
        background: hov ? 'rgba(124,58,237,0.1)' : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      💬 <span>{count}</span>
    </Link>
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
    if (replace) setPosts(list); else setPosts(prev => [...prev, ...list]);
    setHasMore(list.length === PAGE_SIZE);
    setPostsLoad(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }
      if (!mounted) return;
      const data = await getProfileCached();
      if (!mounted) return;
      if (!data?.username) { setState('no-profile'); setTimeout(() => router.replace('/profile/setup'), 1500); return; }
      setMyProfile({ ...(data as any), id: user.id });
      setState('ready');
      fetchPosts('all', 0, true);
    };
    init();
    return () => { mounted = false; };
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

  /* ── 로딩 / 프로필 없음 ── */
  if (state === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#060610', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #1a1830', borderTopColor: '#7c3aed', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
        <p style={{ color: '#2d2b50', fontSize: '0.85rem' }}>불러오는 중...</p>
      </div>
    </div>
  );
  if (state === 'no-profile') return (
    <div style={{ minHeight: '100vh', background: '#060610', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: '16px' }}>
      <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#c4b5fd' }}>프로필 설정이 필요해요</p>
      <button onClick={() => router.replace('/profile/setup')} style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', border: 'none', borderRadius: '12px', padding: '10px 24px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>지금 설정하기</button>
    </div>
  );

  const canPost = (content.trim().length > 0 || images.length > 0) && !posting;

  return (
    <SidebarLayout rightPanel={<RightPanel />}>
      {reportTarget && <ReportModal targetType="post" targetId={reportTarget} onClose={() => setReportTarget(null)} />}
      {editTarget && (
        <EditPostModal
          postId={editTarget.id} content={editTarget.content}
          images={(editTarget as any).images ?? []}
          onSave={(newContent, newImages) => setPosts(prev => prev.map(p => p.id === editTarget.id ? { ...p, content: newContent, images: newImages } : p))}
          onClose={() => setEditTarget(null)}
        />
      )}
      {menuOpen && <div onClick={() => setMenuOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}

      <div style={{ maxWidth: '660px', margin: '0 auto' }}>

        {/* ── 헤더 + 탭 ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(6,6,16,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #0f0f22',
        }}>
          <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em' }}>피드</h1>
          </div>
          <div style={{ display: 'flex', padding: '0 24px' }}>
            {([{ key: 'all', label: '전체' }, { key: 'following', label: '팔로잉' }] as { key: FeedTab; label: string }[]).map(t => (
              <button key={t.key} onClick={() => handleTabChange(t.key)} style={{
                flex: 1, padding: '12px 0', background: 'transparent', border: 'none',
                cursor: 'pointer', fontSize: '0.86rem', fontWeight: feedTab === t.key ? 700 : 400,
                color: feedTab === t.key ? '#c4b5fd' : '#2d2b50',
                borderBottom: feedTab === t.key ? '2px solid #7c3aed' : '2px solid transparent',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* ── 글쓰기 박스 ── */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #0f0f22' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Avatar url={myProfile!.avatar_url} name={myProfile!.display_name} size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {!writing ? (
                <button
                  onClick={() => setWriting(true)}
                  style={{
                    width: '100%', textAlign: 'left', background: '#0d0d1f',
                    border: '1.5px solid #1a1830', borderRadius: '14px',
                    padding: '12px 16px', color: '#2d2b50', fontSize: '0.9rem',
                    cursor: 'text', transition: 'border-color 0.15s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed44'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a1830'; }}
                >무슨 생각을 하고 있나요?</button>
              ) : (
                <div style={{ background: '#0d0d1f', border: '1.5px solid #7c3aed55', borderRadius: '14px', padding: '14px 16px' }}>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="무슨 생각을 하고 있나요?"
                    rows={3} autoFocus maxLength={500}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      color: '#c4b5fd', fontSize: '0.92rem', outline: 'none',
                      resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                      lineHeight: 1.75, marginBottom: '10px',
                    }}
                  />
                  <div style={{ marginBottom: '12px' }}>
                    <ImageUploader bucket="post-images" images={images} onChange={setImages} maxCount={4} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: content.length > 450 ? '#f97316' : '#2d2b50' }}>{content.length}/500</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => { setWriting(false); setContent(''); setImages([]); }}
                        style={{ padding: '7px 16px', borderRadius: '10px', border: '1px solid #1a1830', background: 'transparent', color: '#3d3660', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2d2b50'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a1830'; }}
                      >취소</button>
                      <button
                        onClick={handlePost}
                        disabled={!canPost}
                        style={{
                          padding: '7px 20px', borderRadius: '10px', border: 'none', fontFamily: 'inherit',
                          background: canPost ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#12112a',
                          color: canPost ? '#fff' : '#2d2b50',
                          fontSize: '0.82rem', fontWeight: 700, cursor: canPost ? 'pointer' : 'not-allowed',
                          boxShadow: canPost ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      >{posting ? '게시 중...' : '게시'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 피드 ── */}
        {postsLoad && posts.length === 0 ? (
          <>{[1,2,3,4].map(i => <SkeletonPost key={i} />)}</>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <p style={{ fontSize: '2.5rem', margin: '0 0 16px' }}>{feedTab === 'following' ? '👥' : '📝'}</p>
            <p style={{ fontSize: '0.9rem', color: '#2d2b50', fontWeight: 600 }}>
              {feedTab === 'following' ? '팔로잉한 사람의 글이 없어요' : '아직 게시글이 없어요'}
            </p>
            {feedTab === 'following' && (
              <Link href="/search" style={{ display: 'inline-flex', marginTop: '16px', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', borderRadius: '12px', padding: '9px 20px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700 }}>🔍 사람 찾기</Link>
            )}
          </div>
        ) : (
          <>
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                isMyPost={post.profile?.username === myProfile?.username}
                onLike={() => handleLike(post.id)}
                onEdit={() => { setEditTarget(post); setMenuOpen(null); }}
                onDelete={() => handleDelete(post.id)}
                onReport={() => { setReportTarget(post.id); setMenuOpen(null); }}
                onBlock={() => { if (post.profile?.username) handleBlock(post.profile.username); }}
                onCopy={() => { navigator.clipboard.writeText(`${location.origin}/feed/${post.id}`); setMenuOpen(null); }}
                menuOpen={menuOpen === post.id}
                setMenuOpen={v => setMenuOpen(v ? post.id : null)}
              />
            ))}

            <div ref={loadMoreRef} style={{ padding: '24px', textAlign: 'center' }}>
              {postsLoad && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#2d2b50', fontSize: '0.8rem' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #1a1830', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
                  더 불러오는 중...
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <p style={{ color: '#1a1830', fontSize: '0.76rem' }}>— 모든 게시글을 봤어요 —</p>
              )}
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}