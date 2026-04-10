'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface MyProfile { username: string; display_name: string; avatar_url: string; }

let _cachedProfile: MyProfile | null = null;

interface Props { children: React.ReactNode; rightPanel?: React.ReactNode; }

const NAV_STATIC = [
  { icon: '📝', label: '피드',          href: '/feed',           badge: 0, divider: false },
  { icon: '🌙', label: '익명 피드',     href: '/story',          badge: 0, divider: false },
  { icon: '🔥', label: '트렌딩',        href: '/trending',       badge: 0, divider: true  },
  { icon: '📔', label: '감정 다이어리', href: '/diary',          badge: 0, divider: false },
  { icon: '💭', label: '상담',          href: '/ai-chat',        badge: 0, divider: false },
  { icon: '🔍', label: '대화 분석',     href: '/kakao-analysis', badge: 0, divider: true  },
  { icon: '🧠', label: '감정 유형 테스트', href: '/emotion-type', badge: 0, divider: false },
  { icon: '🎰', label: '위로 자판기',   href: '/comfort',        badge: 0, divider: false },
  { icon: '💌', label: '감정 펜팔',     href: '/penpal',         badge: 0, divider: true  },
  { icon: '🔎', label: '검색',          href: '/search',         badge: 0, divider: false },
];

export default function SidebarLayout({ children, rightPanel }: Props) {
  const [myProfile,   setMyProfile]   = useState<MyProfile | null>(_cachedProfile);
  const [unreadDM,    setUnreadDM]    = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [mounted,     setMounted]     = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => { setMounted(true); }, []);

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
      if (!_cachedProfile) {
        const res  = await fetch('/api/profile');
        const data = await res.json();
        if (data?.username) { _cachedProfile = data; setMyProfile(data); }
      }
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

  const isActive = (href: string) =>
    pathname === href
    || (href === '/story' && pathname.startsWith('/story'))
    || (href === '/feed'  && pathname.startsWith('/feed'))
    || (href !== '/feed' && href !== '/story' && pathname.startsWith(href + '/'));

  // mounted 후에만 pathname 기반 동적값 사용 → hydration 방지
  const isStoryPath = mounted && pathname.startsWith('/story');
  const writeHref   = isStoryPath ? '/story/write' : '/feed';
  const writeLabel  = isStoryPath ? '🌙 익명으로 털어놓기' : '✏️ 게시하기';

  const dynNavItems = [
    { icon: '🔔', label: '알림',   href: '/notifications', badge: unreadNotif, divider: false },
    { icon: '💬', label: '메시지', href: '/messages',      badge: unreadDM,    divider: true  },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060610',
      fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
      display: 'flex',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1400px',
        display: 'flex',
        position: 'relative',
      }}>

        {/* ── 사이드바 ── */}
        <aside style={{
          width: '260px',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 8px',
          borderRight: '1px solid #12112a',
          boxSizing: 'border-box',
          overflowY: 'auto',
          background: '#08081a',
        }}>

          {/* 로고 */}
          <Link href="/story" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '18px 12px 14px',
              borderBottom: '1px solid #12112a',
              marginBottom: '8px',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png" alt="kyorang"
                style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: '9px', flexShrink: 0 }}
              />
              <div>
                <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#c4b5fd', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                  교랑 스토리
                </p>
                <p style={{ margin: 0, fontSize: '0.6rem', color: '#2d2b50', marginTop: '2px' }}>
                  story.kyorang.com
                </p>
              </div>
            </div>
          </Link>

          {/* 네비게이션 */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>

            {/* 정적 항목 */}
            {NAV_STATIC.map((item, i) => {
              const active = isActive(item.href);
              return (
                <div key={item.href}>
                  {item.divider && i !== 0 && (
                    <div style={{ height: '1px', background: '#12112a', margin: '5px 8px' }} />
                  )}
                  <NavItem href={item.href} icon={item.icon} label={item.label} active={active} badge={0} />
                </div>
              );
            })}

            {/* 동적 항목 (알림/메시지 뱃지) */}
            {dynNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <div key={item.href}>
                  {item.divider && (
                    <div style={{ height: '1px', background: '#12112a', margin: '5px 8px' }} />
                  )}
                  <NavItem href={item.href} icon={item.icon} label={item.label} active={active} badge={item.badge} />
                </div>
              );
            })}

            {/* 프로필 — display_name이 동적이므로 별도 처리 */}
            <NavItem
              href={myProfile ? `/profile/${myProfile.username}` : '/profile/setup'}
              icon="👤"
              label="내 프로필"
              active={isActive(myProfile ? `/profile/${myProfile.username}` : '/profile/setup')}
              badge={0}
            />
            <NavItem href="/settings" icon="⚙️" label="설정" active={isActive('/settings')} badge={0} />

            <div style={{ height: '1px', background: '#12112a', margin: '8px 8px' }} />

            {/* 글쓰기 버튼 */}
            <Link
              href={writeHref}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '11px 16px',
                background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                borderRadius: '12px', textDecoration: 'none', color: '#fff',
                fontWeight: 700, fontSize: '0.85rem', gap: '6px',
                boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
                transition: 'opacity 0.15s, transform 0.15s',
                marginTop: '2px',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.opacity = '0.88'; el.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.opacity = '1'; el.style.transform = 'none'; }}
            >
              {writeLabel}
            </Link>
          </nav>

          {/* 하단 프로필 카드 */}
          {myProfile && (
            <Link
              href={`/profile/${myProfile.username}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px', borderRadius: '12px', textDecoration: 'none',
                borderTop: '1px solid #12112a', margin: '8px 0 4px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#12112a'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {myProfile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={myProfile.avatar_url} alt={myProfile.display_name}
                  style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(124,58,237,0.2)', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.82rem', fontWeight: 700, color: '#fff',
                }}>
                  {myProfile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#c4b5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {myProfile.display_name}
                </p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#2d2b50', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  @{myProfile.username}
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#1e1c3a', flexShrink: 0 }}>···</span>
            </Link>
          )}
        </aside>

        {/* ── 중앙 콘텐츠 ── */}
        <main style={{
          flex: 1,
          minWidth: 0,
          borderRight: rightPanel ? '1px solid #12112a' : 'none',
        }}>
          {children}
        </main>

        {/* ── 우측 패널 ── */}
        {rightPanel && (
          <aside style={{
            width: '300px',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto',
            boxSizing: 'border-box',
            background: '#08081a',
          }}>
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  );
}

/* ── 네비 아이템 (hover state 분리 → hydration 안전) ── */
function NavItem({
  href, icon, label, active, badge,
}: { href: string; icon: string; label: string; active: boolean; badge: number }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '9px 12px', borderRadius: '10px', textDecoration: 'none',
        background: active ? 'rgba(124,58,237,0.14)' : hov ? '#12112a' : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <div style={{ position: 'relative', width: '22px', textAlign: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '1.05rem' }}>{icon}</span>
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-5px',
            background: '#ef4444', color: '#fff', borderRadius: '50%',
            width: '15px', height: '15px', fontSize: '0.55rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
          }}>{badge > 9 ? '9+' : badge}</span>
        )}
      </div>
      <span style={{
        fontSize: '0.875rem', fontWeight: active ? 700 : 400,
        color: active ? '#c4b5fd' : hov ? '#7c6fa0' : '#4a5568',
        letterSpacing: '-0.01em', flex: 1,
        transition: 'color 0.12s',
      }}>
        {label}
      </span>
      {active && (
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
      )}
    </Link>
  );
}