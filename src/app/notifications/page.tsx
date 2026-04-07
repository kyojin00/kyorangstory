'use client';

// src/app/notifications/page.tsx

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

interface Actor {
  id:           string;
  username:     string;
  display_name: string;
  avatar_url:   string;
}

interface Notification {
  id:          string;
  type:        'follow_request' | 'follow_accept' | 'follow' | 'like' | 'comment' | 'reply';
  actor_id:    string;
  actor:       Actor | null;
  target_id:   string | null;
  target_type: string | null;
  is_read:     boolean;
  created_at:  string;
}

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

// 알림 타입별 정보
const TYPE_INFO: Record<string, { icon: string; text: (name: string) => string }> = {
  follow_request: { icon: '👤', text: name => `${name}님이 팔로우를 요청했어요` },
  follow_accept:  { icon: '✅', text: name => `${name}님이 팔로우 요청을 수락했어요` },
  follow:         { icon: '👋', text: name => `${name}님이 팔로우했어요` },
  like:           { icon: '❤️', text: name => `${name}님이 좋아요를 눌렀어요` },
  comment:        { icon: '💬', text: name => `${name}님이 댓글을 남겼어요` },
  reply:          { icon: '↩️', text: name => `${name}님이 답글을 남겼어요` },
};

// 알림 클릭 시 이동할 링크
function getTargetLink(notif: Notification): string | null {
  const { type, target_id, target_type } = notif;
  if (!target_id) return null;

  if (type === 'like' || type === 'comment' || type === 'reply') {
    if (target_type === 'post')  return `/feed/${target_id}`;
    if (target_type === 'story') return `/story/${target_id}`;
  }
  if (type === 'follow' || type === 'follow_accept') {
    return notif.actor?.username ? `/profile/${notif.actor.username}` : null;
  }
  return null;
}

export default function NotificationsPage() {
  const [notifs,   setNotifs]   = useState<Notification[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [handling, setHandling] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rows } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!rows?.length) { setLoading(false); return; }

      const actorIds = [...new Set(rows.map(n => n.actor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', actorIds);

      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
      setNotifs(rows.map(n => ({ ...n, actor: profileMap[n.actor_id] ?? null })));

      // 전체 읽음 처리
      await supabase.from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (!error) setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const handleDeleteAll = async () => {
    if (!confirm('알림을 모두 삭제할까요?')) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifs([]);
  };

  const handleFollowAction = async (notif: Notification, action: 'accept' | 'decline') => {
    if (!notif.actor?.username || handling) return;
    setHandling(notif.id);
    await fetch(`/api/profile/${notif.actor.username}/follow`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    await supabase.from('notifications').delete().eq('id', notif.id);
    setNotifs(prev => prev.filter(n => n.id !== notif.id));
    setHandling(null);
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '640px', margin: '0 auto', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        {/* 헤더 */}
        <div style={{
          borderBottom: '1px solid #1e1b3a', padding: '18px 20px',
          position: 'sticky', top: 0, background: '#080810', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#e2e8f0' }}>알림</h1>
            {unreadCount > 0 && (
              <span style={{ background: '#7c3aed', color: '#fff', borderRadius: '20px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
                {unreadCount}
              </span>
            )}
          </div>
          {notifs.length > 0 && (
            <button onClick={handleDeleteAll} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.82rem', transition: 'color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
            >
              모두 삭제
            </button>
          )}
        </div>

        {/* 알림 목록 */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>불러오는 중...</p>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#334155' }}>
            <p style={{ fontSize: '2.5rem', margin: '0 0 14px' }}>🔔</p>
            <p style={{ fontSize: '0.9rem' }}>아직 알림이 없어요</p>
          </div>
        ) : notifs.map(notif => {
          const info     = TYPE_INFO[notif.type];
          const name     = notif.actor?.display_name ?? '누군가';
          const isUnread = !notif.is_read;
          const link     = getTargetLink(notif);

          return (
            <div
              key={notif.id}
              style={{
                padding: '14px 20px', borderBottom: '1px solid #1e1b3a',
                background: isUnread ? '#0f0a1a' : 'transparent',
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                position: 'relative', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0a0a16'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isUnread ? '#0f0a1a' : 'transparent'; }}
            >
              {/* 읽지 않음 dot */}
              {isUnread && (
                <div style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed' }} />
              )}

              {/* 아바타 */}
              {notif.actor?.username ? (
                <Link href={`/profile/${notif.actor.username}`}>
                  <Avatar url={notif.actor.avatar_url} name={notif.actor.display_name} size={44} />
                </Link>
              ) : (
                <Avatar name="?" size={44} />
              )}

              {/* 내용 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  {/* 텍스트 + 링크 */}
                  {link ? (
                    <Link href={link} style={{ textDecoration: 'none', flex: 1 }}>
                      <p style={{ margin: '0 0 4px', fontSize: '0.875rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                        <span style={{ marginRight: '6px' }}>{info?.icon}</span>
                        <span style={{ fontWeight: isUnread ? 700 : 500 }}>
                          {info?.text(name) ?? `${name}님의 알림`}
                        </span>
                      </p>
                    </Link>
                  ) : (
                    <p style={{ margin: '0 0 4px', fontSize: '0.875rem', color: '#e2e8f0', lineHeight: 1.5, flex: 1 }}>
                      <span style={{ marginRight: '6px' }}>{info?.icon}</span>
                      <span style={{ fontWeight: isUnread ? 700 : 500 }}>
                        {info?.text(name) ?? `${name}님의 알림`}
                      </span>
                    </p>
                  )}

                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', fontSize: '0.85rem', padding: 0, flexShrink: 0, transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#334155'; }}
                  >
                    ✕
                  </button>
                </div>

                <p style={{ margin: '0 0 10px', fontSize: '0.75rem', color: '#475569' }}>
                  {timeAgo(notif.created_at)}
                </p>

                {/* 팔로우 요청 수락/거절 */}
                {notif.type === 'follow_request' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleFollowAction(notif, 'accept')}
                      disabled={handling === notif.id}
                      style={{
                        padding: '7px 18px', borderRadius: '20px', border: 'none',
                        background: handling === notif.id ? '#1e1b3a' : '#7c3aed',
                        color: '#fff', fontSize: '0.82rem', fontWeight: 700,
                        cursor: handling === notif.id ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {handling === notif.id ? '처리 중...' : '✓ 수락'}
                    </button>
                    <button
                      onClick={() => handleFollowAction(notif, 'decline')}
                      disabled={handling === notif.id}
                      style={{
                        padding: '7px 18px', borderRadius: '20px',
                        border: '1px solid #334155', background: 'transparent',
                        color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600,
                        cursor: handling === notif.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ✕ 거절
                    </button>
                    {notif.actor?.username && (
                      <Link href={`/profile/${notif.actor.username}`} style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #1e1b3a', color: '#64748b', fontSize: '0.82rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        프로필 보기
                      </Link>
                    )}
                  </div>
                )}

                {/* 팔로우 수락됨 */}
                {notif.type === 'follow_accept' && notif.actor?.username && (
                  <Link href={`/profile/${notif.actor.username}`} style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '20px', border: '1px solid #1e1b3a', color: '#94a3b8', fontSize: '0.82rem', textDecoration: 'none' }}>
                    프로필 보기
                  </Link>
                )}

                {/* 좋아요/댓글: 글 보기 링크 */}
                {['like', 'comment', 'reply'].includes(notif.type) && link && (
                  <Link href={link} style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '20px', border: '1px solid #1e1b3a', color: '#94a3b8', fontSize: '0.82rem', textDecoration: 'none', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1b3a'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
                  >
                    {notif.target_type === 'story' ? '🌙 스토리 보기' : '📝 게시글 보기'} →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SidebarLayout>
  );
}