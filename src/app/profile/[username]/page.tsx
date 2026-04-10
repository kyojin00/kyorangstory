'use client';

// src/app/profile/[username]/page.tsx

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Profile, Post } from '@/types/profile';
import SidebarLayout from '@/components/SidebarLayout';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/* ── 아바타 ── */
function Avatar({ url, name, size = 80 }: { url?: string; name?: string; size?: number }) {
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? ''} style={{
      width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
      border: '3px solid #1a1830', boxShadow: '0 0 0 3px rgba(124,58,237,0.2)',
    }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff',
      border: '3px solid #1a1830', boxShadow: '0 0 0 3px rgba(124,58,237,0.2)',
    }}>
      {(name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}

/* ── 포스트 카드 ── */
function PostCard({ post, onLike }: { post: Post; onLike: () => void }) {
  const [hov, setHov] = useState(false);
  const [likeHov, setLikeHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '18px 0', borderBottom: '1px solid #0f0f22',
        background: hov ? '#09091a' : 'transparent',
        transition: 'background 0.15s', borderRadius: '4px',
        marginLeft: '-4px', paddingLeft: '4px',
      }}
    >
      <Link href={`/feed/${post.id}`} style={{ textDecoration: 'none' }}>
        <p style={{
          margin: '0 0 14px', fontSize: '0.92rem', lineHeight: 1.8,
          color: '#7c7a9a', whiteSpace: 'pre-wrap', cursor: 'pointer',
          display: '-webkit-box', WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
          letterSpacing: '-0.01em',
        }}>
          {post.content}
        </p>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={onLike}
          onMouseEnter={() => setLikeHov(true)}
          onMouseLeave={() => setLikeHov(false)}
          style={{
            background: post.is_liked || likeHov ? 'rgba(239,68,68,0.1)' : 'transparent',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px',
            color: post.is_liked ? '#f87171' : likeHov ? '#f87171' : '#2d2b50',
            fontSize: '0.8rem', padding: '5px 10px', borderRadius: '8px',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}
        >
          {post.is_liked ? '❤️' : '🤍'} <span style={{ fontWeight: post.is_liked ? 700 : 400 }}>{post.likes_count}</span>
        </button>
        <Link href={`/feed/${post.id}`} style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          color: '#2d2b50', fontSize: '0.8rem', textDecoration: 'none',
          padding: '5px 10px', borderRadius: '8px', transition: 'all 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#2d2b50'; }}
        >
          💬 {post.comments_count}
        </Link>
        <span suppressHydrationWarning style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#1e1c3a' }}>
          {timeAgo(post.created_at)}
        </span>
      </div>
    </div>
  );
}

/* ── 통계 셀 ── */
function StatCell({ value, label, href }: { value: number; label: string; href?: string }) {
  const inner = (
    <div style={{ textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#c4b5fd', letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ margin: 0, fontSize: '0.72rem', color: '#2d2b50', marginTop: '3px' }}>{label}</p>
    </div>
  );
  if (href) return (
    <Link href={href} style={{ textDecoration: 'none', transition: 'opacity 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
    >{inner}</Link>
  );
  return inner;
}

type PageState    = 'loading' | 'not-found' | 'ready';
type FollowStatus = 'none' | 'pending' | 'following';

export default function ProfilePage() {
  const params   = useParams<{ username: string }>();
  const username = params?.username ?? '';

  const [pageState,    setPageState]    = useState<PageState>('loading');
  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [posts,        setPosts]        = useState<Post[]>([]);
  const [isMe,         setIsMe]         = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>('none');
  const [isPrivate,    setIsPrivate]    = useState(false);
  const [canViewPosts, setCanViewPosts] = useState(true);
  const [fLoading,     setFLoading]     = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!username) return;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof }     = await supabase
        .from('profiles').select('*').eq('username', username).maybeSingle();

      if (!prof) {
        if (user) setIsMe(true);
        setPageState('not-found');
        return;
      }

      const me = user?.id === prof.id;
      setIsMe(me);
      setIsPrivate(!!prof.is_private);

      let followSt: FollowStatus = 'none';
      if (user && !me) {
        const { data: f } = await supabase
          .from('follows').select('status')
          .eq('follower_id', user.id).eq('following_id', prof.id)
          .maybeSingle();
        if (f?.status === 'accepted')     followSt = 'following';
        else if (f?.status === 'pending') followSt = 'pending';
      }
      setFollowStatus(followSt);

      const canView = me || !prof.is_private || followSt === 'following';
      setCanViewPosts(canView);
      setProfile({ ...prof, is_following: followSt === 'following' });

      if (canView) {
        const res  = await fetch(`/api/posts?user_id=${prof.id}`);
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      }
      setPageState('ready');
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleFollow = async () => {
    if (fLoading) return;
    setFLoading(true);
    const res  = await fetch(`/api/profile/${username}/follow`, { method: 'POST' });
    const data = await res.json();

    if (data.action === 'requested') {
      setFollowStatus('pending');
    } else if (data.action === 'followed') {
      setFollowStatus('following');
      setCanViewPosts(true);
      const { data: prof } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
      if (prof) {
        const res2 = await fetch(`/api/posts?user_id=${prof.id}`);
        const d2   = await res2.json();
        setPosts(Array.isArray(d2) ? d2 : []);
      }
      setProfile(prev => prev ? { ...prev, followers_count: (prev.followers_count ?? 0) + 1 } : prev);
    } else if (data.action === 'unfollowed') {
      setFollowStatus('none');
      if (isPrivate) { setCanViewPosts(false); setPosts([]); }
      setProfile(prev => prev ? { ...prev, followers_count: Math.max(0, (prev.followers_count ?? 0) - 1) } : prev);
    } else if (data.action === 'request_cancelled') {
      setFollowStatus('none');
    }
    setFLoading(false);
  };

  const handleLike = async (postId: string) => {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    ));
  };

  /* ── 로딩 ── */
  if (pageState === 'loading') return (
    <SidebarLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #1a1830', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
      </div>
    </SidebarLayout>
  );

  /* ── 없음 ── */
  if (pageState === 'not-found') return (
    <SidebarLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <div style={{ fontSize: '3rem' }}>{isMe ? '👤' : '🔍'}</div>
        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#c4b5fd' }}>
          {isMe ? '프로필 설정이 필요해요' : '존재하지 않는 프로필이에요'}
        </p>
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#3d3660', textAlign: 'center', lineHeight: 1.7 }}>
          {isMe ? '아이디와 이름을 설정해야 프로필을 사용할 수 있어요' : '삭제됐거나 잘못된 주소예요'}
        </p>
        <Link href={isMe ? '/profile/setup' : '/feed'} style={{
          background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', borderRadius: '14px',
          padding: '11px 28px', color: '#fff', fontSize: '0.88rem', fontWeight: 700,
          textDecoration: 'none', boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
        }}>
          {isMe ? '프로필 설정하기' : '피드로 돌아가기'}
        </Link>
      </div>
    </SidebarLayout>
  );

  const followBtnStyle: React.CSSProperties = {
    padding: '9px 22px', borderRadius: '12px', border: 'none', fontFamily: 'inherit',
    fontSize: '0.84rem', fontWeight: 700, cursor: fLoading ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
    background: followStatus === 'none'
      ? 'linear-gradient(135deg, #7c3aed, #5b21b6)'
      : followStatus === 'pending' ? '#12112a' : '#12112a',
    color: followStatus === 'none' ? '#fff' : '#4a5568',
    outline: followStatus === 'following' ? '1px solid #1a1830'
           : followStatus === 'pending'   ? '1px solid rgba(124,58,237,0.3)' : 'none',
    boxShadow: followStatus === 'none' ? '0 4px 16px rgba(124,58,237,0.3)' : 'none',
  };

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '660px', margin: '0 auto' }}>

        {/* ── 헤더 ── */}
        <div style={{
          padding: '14px 24px', position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(6,6,16,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #0f0f22',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Link href="/feed" style={{
            background: '#12112a', border: 'none', color: '#a78bfa',
            fontSize: '0.85rem', fontWeight: 600, padding: '7px 12px',
            borderRadius: '10px', textDecoration: 'none', lineHeight: 1,
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#12112a'; }}
          >← 뒤로</Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {profile?.display_name}
              {isPrivate && <span style={{ fontSize: '0.75rem', color: '#2d2b50' }}>🔒</span>}
            </h1>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#2d2b50', marginTop: '1px' }}>게시글 {profile?.posts_count ?? 0}개</p>
          </div>
        </div>

        <div style={{ padding: '0 24px' }}>

          {/* ── 프로필 헤더 영역 ── */}
          <div style={{
            padding: '28px 0 24px',
            borderBottom: '1px solid #0f0f22',
          }}>
            {/* 아바타 + 버튼 행 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
              <Avatar url={profile?.avatar_url} name={profile?.display_name} size={80} />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                {isMe ? (
                  <>
                    <Link href="/profile/edit" style={{
                      padding: '9px 18px', borderRadius: '12px',
                      border: '1px solid #1a1830', background: 'transparent',
                      color: '#4a5568', fontSize: '0.84rem', fontWeight: 600,
                      textDecoration: 'none', transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#2d2b50'; el.style.color = '#7c6fa0'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1a1830'; el.style.color = '#4a5568'; }}
                    >프로필 수정</Link>
                    <Link href="/settings" style={{
                      padding: '9px 12px', borderRadius: '12px',
                      border: '1px solid #1a1830', background: 'transparent',
                      color: '#4a5568', fontSize: '0.88rem', textDecoration: 'none',
                      transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2d2b50'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a1830'; }}
                    >⚙️</Link>
                  </>
                ) : (
                  <>
                    <Link href={`/messages/${username}`} style={{
                      padding: '9px 12px', borderRadius: '12px',
                      border: '1px solid #1a1830', background: 'transparent',
                      color: '#4a5568', fontSize: '0.88rem', textDecoration: 'none',
                      transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2d2b50'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a1830'; }}
                    >💬</Link>
                    <button onClick={handleFollow} disabled={fLoading} style={followBtnStyle}>
                      {fLoading ? '...' : followStatus === 'following' ? '팔로잉' : followStatus === 'pending' ? '요청됨' : '팔로우'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 이름 + 유저네임 + 바이오 */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 3px', fontWeight: 900, fontSize: '1.15rem', color: '#e2e8f0', letterSpacing: '-0.03em' }}>
                {profile?.display_name}
              </p>
              <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#2d2b50' }}>@{profile?.username}</p>
              {profile?.bio && (
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#7c7a9a', lineHeight: 1.75 }}>
                  {profile.bio}
                </p>
              )}
            </div>

            {/* 팔로우 요청 중 배너 */}
            {followStatus === 'pending' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
                borderRadius: '12px', padding: '10px 14px', marginBottom: '16px',
              }}>
                <span style={{ fontSize: '0.9rem' }}>⏳</span>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#7c6fa0' }}>팔로우 요청을 보냈어요. 상대방의 수락을 기다리고 있어요.</p>
              </div>
            )}

            {/* 통계 */}
            <div style={{
              display: 'flex', gap: '0',
              background: '#0c0c1e', border: '1px solid #1a1830',
              borderRadius: '16px', overflow: 'hidden',
            }}>
              {[
                { value: profile?.posts_count ?? 0,     label: '게시글',  href: undefined },
                { value: profile?.followers_count ?? 0, label: '팔로워',  href: `/profile/${username}/followers` },
                { value: profile?.following_count ?? 0, label: '팔로잉',  href: `/profile/${username}/following` },
              ].map((s, i) => (
                <div key={s.label} style={{
                  flex: 1, padding: '16px 8px',
                  borderRight: i < 2 ? '1px solid #1a1830' : 'none',
                }}>
                  <StatCell value={s.value} label={s.label} href={s.href} />
                </div>
              ))}
            </div>
          </div>

          {/* ── 게시글 ── */}
          {!canViewPosts ? (
            <div style={{ textAlign: 'center', padding: '64px 20px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#0c0c1e', border: '1px solid #1a1830',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', margin: '0 auto 20px',
              }}>🔒</div>
              <p style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#c4b5fd' }}>비공개 계정이에요</p>
              <p style={{ margin: '0 0 24px', fontSize: '0.84rem', color: '#3d3660', lineHeight: 1.7 }}>
                팔로우 요청을 보내고<br />수락되면 게시글을 볼 수 있어요
              </p>
              {followStatus === 'none' && (
                <button onClick={handleFollow} disabled={fLoading} style={{
                  background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                  border: 'none', borderRadius: '14px', padding: '11px 28px',
                  color: '#fff', fontSize: '0.88rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                }}>팔로우 요청하기</button>
              )}
              {followStatus === 'pending' && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: '12px', padding: '10px 18px',
                }}>
                  <span>⏳</span>
                  <span style={{ fontSize: '0.82rem', color: '#7c6fa0' }}>요청 대기 중...</span>
                </div>
              )}
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 20px' }}>
              <p style={{ fontSize: '2.5rem', margin: '0 0 14px' }}>📝</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#2d2b50', fontWeight: 600 }}>아직 게시글이 없어요</p>
            </div>
          ) : (
            <div style={{ paddingTop: '8px' }}>
              {posts.map(post => (
                <PostCard key={post.id} post={post} onLike={() => handleLike(post.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}