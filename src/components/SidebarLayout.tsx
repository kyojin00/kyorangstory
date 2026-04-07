'use client';

// src/components/SidebarLayout.tsx

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  children:    React.ReactNode;
  rightPanel?: React.ReactNode;
}

interface MyProfile {
  username:     string;
  display_name: string;
  avatar_url:   string;
}

export default function SidebarLayout({ children, rightPanel }: Props) {
  const [myProfile,   setMyProfile]   = useState<MyProfile | null>(null);
  const [unreadDM,    setUnreadDM]    = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const refreshCounts = async (uid: string) => {
      const [{ count: dmCount }, { count: notifCount }] = await Promise.all([
        supabase.from('direct_messages').select('*', { count: 'exact', head: true }).eq('receiver_id', uid).eq('is_read', false),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false),
      ]);
      setUnreadDM(dmCount ?? 0);
      setUnreadNotif(notifCount ?? 0);
    };

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res  = await fetch('/api/profile');
      const data = await res.json();
      if (data?.username) setMyProfile(data);
      await refreshCounts(user.id);
      interval = setInterval(() => refreshCounts(user.id), 5000);
    };

    init();
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pathname === '/notifications') setUnreadNotif(0);
    if (pathname === '/messages')      setUnreadDM(0);
  }, [pathname]);

  const navItems = [
    { icon: '📝', label: '피드',          href: '/feed',           badge: 0,           divider: false },
    { icon: '🌙', label: '익명 피드',     href: '/story',          badge: 0,           divider: false },
    { icon: '🔥', label: '트렌딩',        href: '/trending',       badge: 0,           divider: true  },
    { icon: '📔', label: '감정 다이어리', href: '/diary',          badge: 0,           divider: false },
    { icon: '💭', label: '상담',          href: '/ai-chat',        badge: 0,           divider: false },
    { icon: '🔍', label: '대화 분석',     href: '/kakao-analysis', badge: 0,           divider: true  },
    { icon: '🔎', label: '검색',          href: '/search',         badge: 0,           divider: false },
    { icon: '🔔', label: '알림',          href: '/notifications',  badge: unreadNotif, divider: false },
    { icon: '💬', label: '메시지',        href: '/messages',       badge: unreadDM,    divider: true  },
    {
      icon:    '👤',
      label:   myProfile?.display_name ?? '내 프로필',
      href:    myProfile ? `/profile/${myProfile.username}` : '/profile/setup',
      badge:   0,
      divider: false,
    },
    { icon: '⚙️', label: '설정', href: '/settings', badge: 0, divider: false },
  ];

  const isActive = (href: string) =>
    pathname === href
    || (href === '/story' && (pathname === '/story' || pathname.startsWith('/story/')))
    || (href === '/feed'  && (pathname === '/feed'  || pathname.startsWith('/feed/')))
    || (href !== '/feed' && href !== '/story' && pathname.startsWith(href + '/'));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Noto Sans KR', sans-serif", display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '1300px', display: 'flex' }}>

        {/* 사이드바 */}
        <aside style={{
          width: '248px', flexShrink: 0,
          position: 'sticky', top: 0, height: '100vh',
          display: 'flex', flexDirection: 'column',
          padding: '20px 12px',
          borderRight: '1px solid var(--border)',
          boxSizing: 'border-box', overflowY: 'auto',
          background: 'var(--bg-card)',
        }}>
          {/* 로고 */}
          <Link href="/story" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px 18px', marginBottom: '6px', borderBottom: '1px solid var(--border)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="kyorang" style={{ width: 34, height: 34, objectFit: 'contain' }} />
              <div>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>교랑 스토리</span>
                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>story.kyorang.com</p>
              </div>
            </div>
          </Link>

          {/* 네비 */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px', paddingTop: '6px' }}>
            {navItems.map((item, i) => {
              const active = isActive(item.href);
              return (
                <div key={item.href}>
                  {item.divider && i !== 0 && (
                    <div style={{ height: '1px', background: 'var(--border)', margin: '8px 8px' }} />
                  )}
                  <Link href={item.href} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '9px 12px', borderRadius: 'var(--radius-md)', textDecoration: 'none',
                    background: active ? 'var(--accent-light)' : 'transparent',
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{ position: 'relative', width: '22px', textAlign: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                      {item.badge > 0 && (
                        <span style={{ position: 'absolute', top: '-4px', right: '-5px', background: 'var(--danger)', color: '#fff', borderRadius: '50%', width: '15px', height: '15px', fontSize: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: active ? 700 : 500, color: active ? 'var(--accent-dark)' : 'var(--text-secondary)', transition: 'color 0.15s' }}>
                      {item.label}
                    </span>
                    {active && (
                      <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: 'var(--accent)', borderRadius: '0 3px 3px 0' }} />
                    )}
                  </Link>
                </div>
              );
            })}

            {/* 구분선 */}
            <div style={{ height: '1px', background: 'var(--border)', margin: '8px 8px' }} />

            {/* 글쓰기 버튼 */}
            <Link
              href={pathname.startsWith('/story') ? '/story/write' : '/feed'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '11px', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: '#fff', fontWeight: 700, fontSize: '0.875rem', gap: '7px',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                boxShadow: '0 2px 8px rgba(232, 149, 109, 0.35)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(232, 149, 109, 0.45)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(232, 149, 109, 0.35)'; }}
            >
              {pathname.startsWith('/story') ? '🌙 털어놓기' : '✏️ 게시하기'}
            </Link>
          </nav>

          {/* 하단 프로필 */}
          {myProfile && (
            <Link href={`/profile/${myProfile.username}`} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: 'var(--radius-md)', textDecoration: 'none',
              borderTop: '1px solid var(--border)', marginTop: '8px', transition: 'background 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {myProfile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={myProfile.avatar_url} alt={myProfile.display_name}
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-light)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                  {myProfile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myProfile.display_name}</p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{myProfile.username}</p>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>···</span>
            </Link>
          )}
        </aside>

        {/* 중앙 콘텐츠 */}
        <main style={{ flex: 1, minWidth: 0, borderRight: rightPanel ? '1px solid var(--border)' : 'none' }}>
          {children}
        </main>

        {/* 우측 위젯 */}
        {rightPanel && (
          <aside style={{ width: '300px', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', boxSizing: 'border-box', background: 'var(--bg-card)' }}>
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  );
}