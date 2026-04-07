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

function Avatar({ url, name, size = 36 }: { url?: string; name?: string; size?: number }) {
  const initial = (name ?? '?').charAt(0).toUpperCase();
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '3px solid #1e1b3a' }} />
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

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('username', username).maybeSingle();

      if (!prof) {
        if (user) setIsMe(true);
        setPageState('not-found');
        return;
      }

      const me = user?.id === prof.id;
      setIsMe(me);
      setIsPrivate(!!prof.is_private);

      // 팔로우 상태
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

      // 비공개 계정이면 팔로워만 글 조회 가능
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
      // 글 로드
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

  const followBtnText = () => {
    if (fLoading)                     return '...';
    if (followStatus === 'following') return '팔로잉';
    if (followStatus === 'pending')   return '요청됨';
    return '팔로우';
  };

  const followBtnStyle: React.CSSProperties = {
    borderRadius: '20px', padding: '8px 20px', border: 'none',
    fontSize: '0.83rem', fontWeight: 700,
    cursor: fLoading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
    background: followStatus === 'none'     ? '#7c3aed'
               : followStatus === 'pending' ? '#1e1b3a'
               : 'transparent',
    color:      followStatus === 'none'     ? '#fff' : '#94a3b8',
    outline:    followStatus === 'following' ? '1px solid #334155'
               : followStatus === 'pending'  ? '1px solid #7c3aed55'
               : 'none',
  };

  if (pageState === 'loading') return (
    <SidebarLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontFamily: 'sans-serif' }}>
        불러오는 중...
      </div>
    </SidebarLayout>
  );

  if (pageState === 'not-found') return (
    <SidebarLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#e2e8f0', fontFamily: 'sans-serif', gap: '16px' }}>
        <div style={{ fontSize: '2.5rem' }}>{isMe ? '👤' : '🔍'}</div>
        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#a78bfa' }}>
          {isMe ? '프로필 설정이 필요해요' : '존재하지 않는 프로필이에요'}
        </p>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
          {isMe ? '아이디와 이름을 설정해야 프로필을 사용할 수 있어요' : '삭제됐거나 잘못된 주소예요'}
        </p>
        <Link href={isMe ? '/profile/setup' : '/feed'} style={{ background: '#7c3aed', borderRadius: '12px', padding: '10px 24px', color: '#fff', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none' }}>
          {isMe ? '프로필 설정하기' : '피드로 돌아가기'}
        </Link>
      </div>
    </SidebarLayout>
  );

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 16px 80px', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        {/* 헤더 */}
        <div style={{ borderBottom: '1px solid #1e1b3a', padding: '16px 0', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, background: '#080810', zIndex: 10 }}>
          <Link href="/feed" style={{ color: '#a78bfa', fontSize: '1.2rem', textDecoration: 'none', lineHeight: 1 }}>←</Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#e2e8f0' }}>
              {profile?.display_name}
              {isPrivate && <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: '#64748b' }}>🔒</span>}
            </h1>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>게시글 {profile?.posts_count ?? 0}개</p>
          </div>
        </div>

        <div style={{ padding: '24px 0 0' }}>
          {/* 아바타 + 버튼 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <Avatar url={profile?.avatar_url} name={profile?.display_name} size={76} />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isMe ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link href="/profile/edit" style={{ background: 'transparent', border: '1px solid #334155', borderRadius: '20px', padding: '8px 18px', color: '#94a3b8', fontSize: '0.83rem', fontWeight: 600, textDecoration: 'none' }}>
                    프로필 수정
                  </Link>
                  <Link href="/settings" style={{ background: 'transparent', border: '1px solid #334155', borderRadius: '20px', padding: '8px 14px', color: '#94a3b8', fontSize: '0.83rem', textDecoration: 'none' }}>⚙️</Link>
                </div>
              ) : (
                <>
                  <Link href={`/messages/${username}`} style={{ background: 'transparent', border: '1px solid #334155', borderRadius: '20px', padding: '8px 14px', color: '#94a3b8', fontSize: '0.83rem', textDecoration: 'none' }}>
                    💬
                  </Link>
                  <button onClick={handleFollow} disabled={fLoading} style={followBtnStyle}>
                    {followBtnText()}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 요청 중 안내 */}
          {followStatus === 'pending' && (
            <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: '#7c3aed', background: '#7c3aed11', border: '1px solid #7c3aed33', borderRadius: '8px', padding: '6px 12px', display: 'inline-block' }}>
              ⏳ 팔로우 요청을 보냈어요. 상대방의 수락을 기다리고 있어요.
            </p>
          )}

          <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '1.1rem', color: '#e2e8f0' }}>{profile?.display_name}</p>
          <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#64748b' }}>@{profile?.username}</p>
          {profile?.bio && <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.65 }}>{profile.bio}</p>}

          {/* 통계 */}
          <div style={{ display: 'flex', gap: '24px', paddingBottom: '20px', borderBottom: '1px solid #1e1b3a' }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#e2e8f0' }}>{profile?.posts_count ?? 0}</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '4px' }}>게시글</span>
            </div>
            <Link href={`/profile/${username}/followers`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', transition: 'opacity 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#e2e8f0' }}>{profile?.followers_count ?? 0}</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>팔로워</span>
            </Link>
            <Link href={`/profile/${username}/following`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', transition: 'opacity 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#e2e8f0' }}>{profile?.following_count ?? 0}</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>팔로잉</span>
            </Link>
          </div>
        </div>

        {/* 게시글 or 비공개 잠금 */}
        {!canViewPosts ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
            <p style={{ fontSize: '2.5rem', margin: '0 0 14px' }}>🔒</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#94a3b8', margin: '0 0 8px' }}>비공개 계정이에요</p>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>
              팔로우 요청을 보내고<br />수락되면 게시글을 볼 수 있어요
            </p>
            {followStatus === 'none' && (
              <button onClick={handleFollow} disabled={fLoading} style={{ background: '#7c3aed', border: 'none', borderRadius: '20px', padding: '10px 24px', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>
                팔로우 요청하기
              </button>
            )}
            {followStatus === 'pending' && (
              <p style={{ fontSize: '0.82rem', color: '#7c3aed', background: '#7c3aed11', border: '1px solid #7c3aed33', borderRadius: '8px', padding: '8px 16px', display: 'inline-block' }}>
                ⏳ 요청 대기 중...
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {posts.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#334155', marginTop: '40px', fontSize: '0.875rem' }}>아직 게시글이 없어요.</p>
            ) : posts.map(post => (
              <div key={post.id} style={{ padding: '16px 0', borderBottom: '1px solid #1e1b3a' }}>
                <Link href={`/feed/${post.id}`} style={{ textDecoration: 'none' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '0.95rem', lineHeight: 1.7, color: '#cbd5e1', whiteSpace: 'pre-wrap', cursor: 'pointer', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {post.content}
                  </p>
                </Link>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <button onClick={() => handleLike(post.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: post.is_liked ? '#ef4444' : '#64748b', fontSize: '0.85rem', padding: 0, transition: 'color 0.15s' }}>
                    {post.is_liked ? '❤️' : '🤍'} {post.likes_count}
                  </button>
                  <Link href={`/feed/${post.id}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '0.85rem', textDecoration: 'none' }}>
                    💬 {post.comments_count}
                  </Link>
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#334155' }}>{timeAgo(post.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}