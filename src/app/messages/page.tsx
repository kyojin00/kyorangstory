'use client';

// src/app/messages/page.tsx

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';

interface Room {
  profile:      { username: string; display_name: string; avatar_url: string };
  last_message: { content: string; sender_id: string; created_at: string };
  unread:       number;
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function MessagesPage() {
  const [rooms,   setRooms]   = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/messages')
      .then(r => r.json())
      .then(data => { setRooms(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 16px 80px' }}>

        {/* 헤더 */}
        <div style={{ padding: '16px 0', borderBottom: '1px solid #1e1b3a', position: 'sticky', top: 0, background: '#080810', zIndex: 10 }}>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0' }}>메시지</h1>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>불러오는 중...</p>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '60px', color: '#334155' }}>
            <p style={{ fontSize: '2rem', marginBottom: '12px' }}>💬</p>
            <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>아직 메시지가 없어요</p>
            <Link href="/search" style={{ background: '#7c3aed', color: '#fff', borderRadius: '20px', padding: '8px 20px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700 }}>
              🔍 사람 찾기
            </Link>
          </div>
        ) : (
          rooms.map(room => (
            <Link key={room.profile.username} href={`/messages/${room.profile.username}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 0', borderBottom: '1px solid #1e1b3a',
                  transition: 'background 0.15s', cursor: 'pointer',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0f0f1f'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Avatar url={room.profile.avatar_url} name={room.profile.display_name} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontWeight: room.unread > 0 ? 800 : 600, fontSize: '0.9rem', color: '#e2e8f0' }}>
                      {room.profile.display_name}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#475569', flexShrink: 0 }}>
                      {timeAgo(room.last_message.created_at)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{
                      margin: 0, fontSize: '0.82rem', color: room.unread > 0 ? '#94a3b8' : '#475569',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px',
                    }}>
                      {room.last_message.content}
                    </p>
                    {room.unread > 0 && (
                      <span style={{
                        background: '#7c3aed', color: '#fff', borderRadius: '50%',
                        minWidth: '18px', height: '18px', fontSize: '0.65rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, flexShrink: 0, padding: '0 4px',
                      }}>
                        {room.unread > 9 ? '9+' : room.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </SidebarLayout>
  );
}