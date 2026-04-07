'use client';

// src/app/profile/[username]/followers/page.tsx
// src/app/profile/[username]/following/page.tsx
// → 이 파일은 두 페이지 모두에 사용 (type prop으로 구분)

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

interface UserItem {
  id:              string;
  username:        string;
  display_name:    string;
  avatar_url:      string;
  followers_count: number;
  is_following:    boolean;
  is_me:           boolean;
}

function Avatar({ url, name, size = 44 }: { url?: string; name?: string; size?: number }) {
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

interface Props { type: 'followers' | 'following' }

export default function FollowListPage({ type }: Props) {
  const params   = useParams<{ username: string }>();
  const username = params?.username ?? '';

  const [users,    setUsers]    = useState<UserItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [myId,     setMyId]     = useState<string | null>(null);
  const [myUser,   setMyUser]   = useState<string | null>(null); // 내 username
  const [handling, setHandling] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);

      if (user) {
        const { data: me } = await supabase
          .from('profiles').select('username').eq('id', user.id).maybeSingle();
        setMyUser(me?.username ?? null);
      }

      const res  = await fetch(`/api/profile/${username}/${type}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, type]);

  // 팔로우 / 언팔로우
  const handleFollow = async (targetUsername: string) => {
    if (handling) return;
    setHandling(targetUsername);

    const res  = await fetch(`/api/profile/${targetUsername}/follow`, { method: 'POST' });
    const data = await res.json();

    setUsers(prev => prev.map(u =>
      u.username === targetUsername
        ? {
            ...u,
            is_following:    data.action === 'followed' || data.action === 'requested',
            followers_count: data.action === 'followed'
              ? u.followers_count + 1
              : data.action === 'unfollowed'
              ? Math.max(0, u.followers_count - 1)
              : u.followers_count,
          }
        : u
    ));
    setHandling(null);
  };

  // 팔로워 제거 (내 팔로워 목록에서만)
  const handleRemoveFollower = async (followerUsername: string) => {
    if (!confirm(`@${followerUsername}님을 팔로워에서 제거할까요?`)) return;
    setHandling(followerUsername);

    await fetch(`/api/profile/${username}/followers`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ follower_username: followerUsername }),
    });

    setUsers(prev => prev.filter(u => u.username !== followerUsername));
    setHandling(null);
  };

  const isMyProfile = myUser === username;
  const title = type === 'followers' ? '팔로워' : '팔로잉';

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '640px', margin: '0 auto', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        {/* 헤더 */}
        <div style={{
          borderBottom: '1px solid #1e1b3a', padding: '18px 20px',
          position: 'sticky', top: 0, background: '#080810', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Link href={`/profile/${username}`} style={{ color: '#a78bfa', fontSize: '1.2rem', textDecoration: 'none', lineHeight: 1 }}>←</Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#e2e8f0' }}>
              {title}
            </h1>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>@{username}</p>
          </div>
        </div>

        {/* 목록 */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>불러오는 중...</p>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#334155' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 12px' }}>👥</p>
            <p style={{ fontSize: '0.9rem' }}>
              {type === 'followers' ? '아직 팔로워가 없어요' : '아직 팔로잉한 사람이 없어요'}
            </p>
          </div>
        ) : users.map(user => (
          <div
            key={user.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 20px', borderBottom: '1px solid #1e1b3a',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0a0a16'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {/* 아바타 */}
            <Link href={`/profile/${user.username}`}>
              <Avatar url={user.avatar_url} name={user.display_name} size={46} />
            </Link>

            {/* 정보 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={`/profile/${user.username}`} style={{ textDecoration: 'none' }}>
                <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.display_name}
                  {user.is_me && (
                    <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: '#7c3aed22', color: '#a78bfa', padding: '1px 6px', borderRadius: '8px', fontWeight: 600 }}>나</span>
                  )}
                </p>
              </Link>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                @{user.username} · 팔로워 {user.followers_count}
              </p>
            </div>

            {/* 버튼 */}
            {!user.is_me && (
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {/* 팔로워 제거 버튼 (내 팔로워 목록에서만) */}
                {type === 'followers' && isMyProfile && (
                  <button
                    onClick={() => handleRemoveFollower(user.username)}
                    disabled={handling === user.username}
                    style={{
                      padding: '7px 12px', borderRadius: '20px',
                      border: '1px solid #334155', background: 'transparent',
                      color: '#64748b', fontSize: '0.78rem', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#ef4444'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#334155'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                  >
                    {handling === user.username ? '...' : '제거'}
                  </button>
                )}

                {/* 팔로우 / 팔로잉 버튼 */}
                <button
                  onClick={() => handleFollow(user.username)}
                  disabled={handling === user.username}
                  style={{
                    padding: '7px 16px', borderRadius: '20px', border: 'none',
                    background: user.is_following ? 'transparent' : '#7c3aed',
                    outline: user.is_following ? '1px solid #334155' : 'none',
                    color: user.is_following ? '#94a3b8' : '#fff',
                    fontSize: '0.82rem', fontWeight: 700,
                    cursor: handling === user.username ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {handling === user.username ? '...' : user.is_following ? '팔로잉' : '팔로우'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </SidebarLayout>
  );
}