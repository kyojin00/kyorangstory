'use client';

// src/app/settings/blocks/page.tsx

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

interface BlockedUser {
  id:           string;
  username:     string;
  display_name: string;
  avatar_url:   string;
  blocked_at:   string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1)  return '오늘';
  if (d < 7)  return `${d}일 전`;
  if (d < 30) return `${Math.floor(d / 7)}주 전`;
  return `${Math.floor(d / 30)}개월 전`;
}

function Avatar({ url, name, size = 44 }: { url?: string; name?: string; size?: number }) {
  const initial = (name ?? '?').charAt(0).toUpperCase();
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: '#1e1b3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#475569' }}>
      {initial}
    </div>
  );
}

export default function BlockListPage() {
  const [blocks,   setBlocks]   = useState<BlockedUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [handling, setHandling] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetch('/api/blocks').then(r => r.json()).then(data => {
      setBlocks(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const handleUnblock = async (username: string) => {
    if (!confirm(`@${username} 차단을 해제할까요?`)) return;
    setHandling(username);
    await fetch(`/api/block/${username}`, { method: 'POST' }); // 토글이므로 POST = 차단 해제
    setBlocks(prev => prev.filter(b => b.username !== username));
    setHandling(null);
  };

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '640px', margin: '0 auto', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        {/* 헤더 */}
        <div style={{ borderBottom: '1px solid #1e1b3a', padding: '18px 20px', position: 'sticky', top: 0, background: '#080810', zIndex: 10, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/settings" style={{ color: '#a78bfa', fontSize: '1.2rem', textDecoration: 'none', lineHeight: 1 }}>←</Link>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0' }}>차단 목록</h1>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>불러오는 중...</p>
        ) : blocks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#334155' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 12px' }}>🚫</p>
            <p style={{ fontSize: '0.9rem' }}>차단한 사용자가 없어요</p>
          </div>
        ) : (
          <>
            <p style={{ padding: '12px 20px', fontSize: '0.82rem', color: '#64748b', borderBottom: '1px solid #1e1b3a', margin: 0 }}>
              총 {blocks.length}명 차단 중
            </p>
            {blocks.map(user => (
              <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid #1e1b3a', transition: 'background 0.1s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0a0a16'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Avatar url={user.avatar_url} name={user.display_name} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '0.9rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.display_name}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569' }}>
                    @{user.username} · {timeAgo(user.blocked_at)} 차단
                  </p>
                </div>
                <button
                  onClick={() => handleUnblock(user.username)}
                  disabled={handling === user.username}
                  style={{
                    padding: '7px 16px', borderRadius: '20px',
                    border: '1px solid #334155', background: 'transparent',
                    color: '#94a3b8', fontSize: '0.82rem', cursor: 'pointer',
                    transition: 'all 0.15s', flexShrink: 0,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#334155'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
                >
                  {handling === user.username ? '...' : '차단 해제'}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </SidebarLayout>
  );
}