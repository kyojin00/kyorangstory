'use client';

// src/app/settings/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

interface Settings {
  require_follow_approval: boolean;
  is_private:              boolean;
  show_activity:           boolean;
  is_admin:                boolean;
}

function ToggleRow({ icon, title, description, value, onChange, saving }: {
  icon: string; title: string; description: string;
  value: boolean; onChange: (v: boolean) => void; saving?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #1e1b3a', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: '2px' }}>{icon}</span>
        <div>
          <p style={{ margin: '0 0 3px', fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0' }}>{title}</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>{description}</p>
        </div>
      </div>
      <button onClick={() => !saving && onChange(!value)} disabled={saving} style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', background: value ? '#7c3aed' : '#1e1b3a', cursor: saving ? 'not-allowed' : 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: '3px', left: value ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px #0004' }} />
      </button>
    </div>
  );
}

function MenuRow({ icon, label, href, danger }: { icon: string; label: string; href: string; danger?: boolean }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', textDecoration: 'none', transition: 'background 0.15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0f0f1f'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: danger ? '#ef4444' : '#94a3b8' }}>{label}</span>
      </Link>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ require_follow_approval: false, is_private: false, show_activity: true, is_admin: false });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [toast,    setToast]    = useState('');
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }
      const res  = await fetch('/api/settings');
      const data = await res.json();
      if (data && !data.error) setSettings(data);
      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (key: keyof Settings, value: boolean) => {
    setSaving(key);
    const prev = settings[key];
    setSettings(s => ({ ...s, [key]: value }));
    const res = await fetch('/api/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
    if (!res.ok) { setSettings(s => ({ ...s, [key]: prev })); setToast('저장 실패'); }
    else setToast('저장됐어요 ✓');
    setSaving(null);
    setTimeout(() => setToast(''), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '640px', margin: '0 auto', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        <div style={{ borderBottom: '1px solid #1e1b3a', padding: '18px 20px', position: 'sticky', top: 0, background: '#080810', zIndex: 10 }}>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#e2e8f0' }}>⚙️ 설정</h1>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>불러오는 중...</p>
        ) : (
          <div style={{ padding: '0 20px' }}>

            {/* 개인정보 보호 */}
            <p style={{ margin: '24px 0 4px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>개인정보 보호</p>

            <ToggleRow icon="🔒" title="팔로우 승인 필요" description="새로운 팔로우를 자동으로 수락하지 않고, 내가 직접 승인해요."
              value={settings.require_follow_approval} saving={saving === 'require_follow_approval'}
              onChange={v => handleToggle('require_follow_approval', v)} />

            <ToggleRow icon="🕵️" title="비공개 계정" description="팔로워만 내 게시글을 볼 수 있어요."
              value={settings.is_private} saving={saving === 'is_private'}
              onChange={v => handleToggle('is_private', v)} />

            <ToggleRow icon="👁️" title="활동 공개" description="다른 사람이 내 좋아요, 댓글 활동을 볼 수 있어요."
              value={settings.show_activity} saving={saving === 'show_activity'}
              onChange={v => handleToggle('show_activity', v)} />

            {/* 계정 */}
            <p style={{ margin: '28px 0 4px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>계정</p>

            <MenuRow icon="✏️" label="프로필 수정"   href="/profile/edit" />
            <MenuRow icon="🚫" label="차단 목록 관리" href="/settings/blocks" />
            {settings.is_admin && <MenuRow icon="🛡️" label="관리자 페이지" href="/admin" />}

            <div style={{ padding: '4px 0' }}>
              <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '12px', border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0f0f1f'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '1.1rem' }}>🚪</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ef4444' }}>로그아웃</span>
              </button>
            </div>

            <p style={{ margin: '24px 0', fontSize: '0.75rem', color: '#334155', textAlign: 'center' }}>
              교랑 스토리 v0.1.0 · © 2025
            </p>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: '#1e1b3a', border: '1px solid #7c3aed44', borderRadius: '20px', padding: '10px 20px', fontSize: '0.875rem', color: '#a78bfa', fontWeight: 600, boxShadow: '0 8px 24px #0008', zIndex: 100 }}>
          {toast}
        </div>
      )}
    </SidebarLayout>
  );
}