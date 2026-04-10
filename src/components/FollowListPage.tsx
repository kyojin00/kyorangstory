'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

interface UserItem { id: string; username: string; display_name: string; avatar_url: string; followers_count: number; is_following: boolean; is_me: boolean; }

function Avatar({ url, name, size = 44 }: { url?: string; name?: string; size?: number }) {
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #1a1830' }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff',
    }}>{(name ?? '?').charAt(0).toUpperCase()}</div>
  );
}

function FollowRow({ user, isMyProfile, type, handling, onFollow, onRemove }: {
  user: UserItem; isMyProfile: boolean; type: 'followers' | 'following';
  handling: string | null; onFollow: (u: string) => void; onRemove: (u: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 20px', borderBottom: '1px solid #0f0f22',
        background: hovered ? '#09091a' : 'transparent', transition: 'background 0.15s',
      }}
    >
      <Link href={`/profile/${user.username}`}>
        <Avatar url={user.avatar_url} name={user.display_name} size={46} />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/profile/${user.username}`} style={{ textDecoration: 'none' }}>
          <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.88rem', color: '#c4b5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {user.display_name}
            {user.is_me && <span style={{ fontSize: '0.65rem', background: 'rgba(124,58,237,0.2)', color: '#a78bfa', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>나</span>}
          </p>
        </Link>
        <p style={{ margin: 0, fontSize: '0.76rem', color: '#2d2b50' }}>@{user.username} · 팔로워 {user.followers_count}</p>
      </div>
      {!user.is_me && (
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {type === 'followers' && isMyProfile && (
            <button
              onClick={() => onRemove(user.username)}
              disabled={handling === user.username}
              style={{
                padding: '7px 12px', borderRadius: '10px',
                border: '1px solid #1a1830', background: 'transparent',
                color: '#3d3660', fontSize: '0.76rem', cursor: 'pointer',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#ef444444'; el.style.color = '#f87171'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1a1830'; el.style.color = '#3d3660'; }}
            >{handling === user.username ? '...' : '제거'}</button>
          )}
          <button
            onClick={() => onFollow(user.username)}
            disabled={handling === user.username}
            style={{
              padding: '7px 16px', borderRadius: '10px', border: 'none', fontFamily: 'inherit',
              background: user.is_following ? '#12112a' : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
              outline: user.is_following ? '1px solid #1a1830' : 'none',
              color: user.is_following ? '#4a5568' : '#fff',
              fontSize: '0.8rem', fontWeight: 700,
              cursor: handling === user.username ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              boxShadow: user.is_following ? 'none' : '0 4px 12px rgba(124,58,237,0.25)',
            }}
          >{handling === user.username ? '...' : user.is_following ? '팔로잉' : '팔로우'}</button>
        </div>
      )}
    </div>
  );
}

interface Props { type: 'followers' | 'following' }

export default function FollowListPage({ type }: Props) {
  const params   = useParams<{ username: string }>();
  const username = params?.username ?? '';
  const [users,    setUsers]    = useState<UserItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [myUser,   setMyUser]   = useState<string | null>(null);
  const [handling, setHandling] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: me } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();
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

  const handleFollow = async (targetUsername: string) => {
    if (handling) return;
    setHandling(targetUsername);
    const res  = await fetch(`/api/profile/${targetUsername}/follow`, { method: 'POST' });
    const data = await res.json();
    setUsers(prev => prev.map(u => u.username === targetUsername
      ? { ...u, is_following: data.action === 'followed' || data.action === 'requested', followers_count: data.action === 'followed' ? u.followers_count + 1 : data.action === 'unfollowed' ? Math.max(0, u.followers_count - 1) : u.followers_count }
      : u
    ));
    setHandling(null);
  };

  const handleRemoveFollower = async (followerUsername: string) => {
    if (!confirm(`@${followerUsername}님을 팔로워에서 제거할까요?`)) return;
    setHandling(followerUsername);
    await fetch(`/api/profile/${username}/followers`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower_username: followerUsername }),
    });
    setUsers(prev => prev.filter(u => u.username !== followerUsername));
    setHandling(null);
  };

  const isMyProfile = myUser === username;
  const title = type === 'followers' ? '팔로워' : '팔로잉';

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{
          padding: '14px 20px', position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(6,6,16,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #0f0f22',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Link
            href={`/profile/${username}`}
            style={{
              color: '#7c3aed', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
              background: '#12112a', padding: '7px 10px', borderRadius: '10px',
              lineHeight: 1, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#12112a'; }}
          >← 뒤로</Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em' }}>{title}</h1>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#2d2b50', marginTop: '1px' }}>@{username}</p>
          </div>
          {!loading && (
            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#2d2b50', background: '#0e0e1f', padding: '4px 10px', borderRadius: '8px', border: '1px solid #12112a' }}>
              {users.length}명
            </span>
          )}
        </div>

        {/* 목록 */}
        {loading ? (
          <>{[1,2,3,4].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid #0f0f22' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#12112a', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, width: '40%', background: '#12112a', borderRadius: 6, marginBottom: 6 }} />
                <div style={{ height: 10, width: '30%', background: '#0e0e1f', borderRadius: 6 }} />
              </div>
            </div>
          ))}</>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <p style={{ fontSize: '2.5rem', margin: '0 0 16px' }}>👥</p>
            <p style={{ fontSize: '0.9rem', color: '#2d2b50', fontWeight: 600 }}>
              {type === 'followers' ? '아직 팔로워가 없어요' : '아직 팔로잉한 사람이 없어요'}
            </p>
          </div>
        ) : users.map(user => (
          <FollowRow
            key={user.id} user={user} isMyProfile={isMyProfile} type={type}
            handling={handling} onFollow={handleFollow} onRemove={handleRemoveFollower}
          />
        ))}
      </div>
    </SidebarLayout>
  );
}