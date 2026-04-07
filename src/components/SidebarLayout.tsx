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
        supabase.from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', uid).eq('is_read', false),
        supabase.from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', uid).eq('is_read', false),
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

      // 5초마다 갱신
      interval = setInterval(() => refreshCounts(user.id), 5000);
    };

    init();
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 알림/메시지 페이지 방문 시 뱃지 초기화
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
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '1300px', display: 'flex', position: 'relative' }}>

        {/* 사이드바 */}
        <aside style={{
          width: '240px', flexShrink: 0,
          position: 'sticky', top: 0, height: '100vh',
          display: 'flex', flexDirection: 'column',
          padding: '24px 12px', borderRight: '1px solid #1e1b3a',
          boxSizing: 'border-box', overflowY: 'auto',
        }}>
          {/* 로고 */}
          <Link href="/feed" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px 20px', marginBottom: '8px', borderBottom: '1px solid #1e1b3a' }}>
              <span style={{ fontSize: '1.5rem' }}>🌙</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#a78bfa', letterSpacing: '-0.5px' }}>교랑 스토리</span>
            </div>
          </Link>

          {/* 네비 */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '8px' }}>
            {navItems.map((item, i) => {
              const active = isActive(item.href);
              return (
                <div key={item.href}>
                  {item.divider && i !== 0 && (
                    <div style={{ height: '1px', background: '#1e1b3a', margin: '6px 14px' }} />
                  )}
                  <Link href={item.href} style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '10px 14px', borderRadius: '12px', textDecoration: 'none',
                    background: active ? '#7c3aed22' : 'transparent',
                    border: active ? '1px solid #7c3aed33' : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{ position: 'relative', width: '24px', textAlign: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '1.15rem' }}>{item.icon}</span>
                      {item.badge > 0 && (
                        <span style={{
                          position: 'absolute', top: '-5px', right: '-6px',
                          background: '#ef4444', color: '#fff', borderRadius: '50%',
                          width: '16px', height: '16px', fontSize: '0.6rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                        }}>
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.925rem', fontWeight: active ? 700 : 500, color: active ? '#a78bfa' : '#94a3b8' }}>
                      {item.label}
                    </span>
                  </Link>
                </div>
              );
            })}

            {/* 구분선 */}
            <div style={{ height: '1px', background: '#1e1b3a', margin: '6px 14px' }} />

            {/* 글쓰기 버튼 */}
            <Link
              href={pathname.startsWith('/story') ? '/story/write' : '/feed'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '11px', background: '#7c3aed', borderRadius: '12px',
                textDecoration: 'none', color: '#fff', fontWeight: 700, fontSize: '0.9rem', gap: '8px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#6d28d9'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#7c3aed'; }}
            >
              {pathname.startsWith('/story') ? '🌙 익명으로 털어놓기' : '✏️ 게시하기'}
            </Link>
          </nav>

          {/* 하단 프로필 */}
          {myProfile && (
            <Link href={`/profile/${myProfile.username}`} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px', borderRadius: '12px', textDecoration: 'none',
              borderTop: '1px solid #1e1b3a', marginTop: '8px', transition: 'background 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {myProfile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={myProfile.avatar_url} alt={myProfile.display_name}
                  style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #7c3aed', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                  {myProfile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myProfile.display_name}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{myProfile.username}</p>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#334155' }}>···</span>
            </Link>
          )}
        </aside>

        {/* 중앙 콘텐츠 */}
        <main style={{ flex: 1, minWidth: 0, borderRight: rightPanel ? '1px solid #1e1b3a' : 'none' }}>
          {children}
        </main>

        {/* 우측 위젯 */}
        {rightPanel && (
          <aside style={{ width: '280px', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', boxSizing: 'border-box', borderLeft: '1px solid #1e1b3a' }}>
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  );
}