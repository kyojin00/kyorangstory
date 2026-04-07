'use client';

// src/app/messages/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

interface ChatRoom {
  partner_id:      string;
  partner_username: string;
  partner_name:    string;
  partner_avatar:  string;
  last_message:    string;
  last_time:       string;
  unread_count:    number;
  is_sent:         boolean; // 내가 보낸 마지막 메시지인지
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}일 전`;
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function Avatar({ url, name, size = 50 }: { url?: string; name?: string; size?: number }) {
  const initial = (name ?? '?').charAt(0).toUpperCase();
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff' }}>
      {initial}
    </div>
  );
}

export default function MessagesPage() {
  const [rooms,   setRooms]   = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId,    setMyId]    = useState<string | null>(null);
  const [search,  setSearch]  = useState('');
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }
      setMyId(user.id);

      // 내가 주고받은 모든 메시지
      const { data: msgs } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (!msgs?.length) { setLoading(false); return; }

      // 대화 상대별 최신 메시지 추출
      const roomMap = new Map<string, ChatRoom>();
      for (const msg of msgs) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!roomMap.has(partnerId)) {
          roomMap.set(partnerId, {
            partner_id:       partnerId,
            partner_username: '',
            partner_name:     '',
            partner_avatar:   '',
            last_message:     msg.content,
            last_time:        msg.created_at,
            unread_count:     0,
            is_sent:          msg.sender_id === user.id,
          });
        }
        // 안읽은 수 계산
        if (msg.receiver_id === user.id && !msg.is_read) {
          const room = roomMap.get(partnerId)!;
          room.unread_count++;
          roomMap.set(partnerId, room);
        }
      }

      // 파트너 프로필 일괄 조회
      const partnerIds = [...roomMap.keys()];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', partnerIds);

      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

      const result: ChatRoom[] = [];
      for (const [id, room] of roomMap) {
        const prof = profileMap[id];
        if (prof) {
          result.push({
            ...room,
            partner_username: prof.username ?? '',
            partner_name:     prof.display_name ?? '알 수 없음',
            partner_avatar:   prof.avatar_url ?? '',
          });
        }
      }

      // 최신순 정렬
      result.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());
      setRooms(result);
      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rooms.filter(r =>
    r.partner_name.toLowerCase().includes(search.toLowerCase()) ||
    r.partner_username.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = rooms.reduce((sum, r) => sum + r.unread_count, 0);

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '640px', margin: '0 auto', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        {/* 헤더 */}
        <div style={{ borderBottom: '1px solid #1e1b3a', padding: '18px 20px', position: 'sticky', top: 0, background: '#080810', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#e2e8f0' }}>메시지</h1>
              {totalUnread > 0 && (
                <span style={{ background: '#7c3aed', color: '#fff', borderRadius: '20px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {totalUnread}
                </span>
              )}
            </div>
          </div>

          {/* 검색창 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '24px', padding: '9px 16px', transition: 'border-color 0.15s' }}
            onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; }}
            onBlur={e  => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1b3a'; }}
          >
            <span style={{ color: '#475569', fontSize: '0.9rem' }}>🔎</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="대화 검색..."
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: '0.875rem', outline: 'none', fontFamily: 'sans-serif' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}>✕</button>
            )}
          </div>
        </div>

        {/* 목록 */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#334155' }}>
            <p style={{ fontSize: '2.5rem', margin: '0 0 14px' }}>💬</p>
            <p style={{ fontSize: '0.9rem', margin: '0 0 16px' }}>
              {search ? `"${search}" 검색 결과가 없어요` : '아직 대화가 없어요'}
            </p>
            {!search && (
              <Link href="/search" style={{ background: '#7c3aed', color: '#fff', borderRadius: '20px', padding: '8px 20px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700 }}>
                🔎 사람 찾기
              </Link>
            )}
          </div>
        ) : filtered.map(room => (
          <Link
            key={room.partner_id}
            href={`/messages/${room.partner_username}`}
            style={{ textDecoration: 'none' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 20px', borderBottom: '1px solid #1e1b3a',
              transition: 'background 0.1s', position: 'relative',
              background: room.unread_count > 0 ? '#0a0818' : 'transparent',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0a0a16'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = room.unread_count > 0 ? '#0a0818' : 'transparent'; }}
            >
              {/* 아바타 */}
              <div style={{ position: 'relative' }}>
                <Avatar url={room.partner_avatar} name={room.partner_name} size={50} />
                {room.unread_count > 0 && (
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: '#22c55e', border: '2px solid #080810' }} />
                )}
              </div>

              {/* 내용 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontWeight: room.unread_count > 0 ? 800 : 600, fontSize: '0.9rem', color: '#e2e8f0' }}>
                    {room.partner_name}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: room.unread_count > 0 ? '#7c3aed' : '#334155', flexShrink: 0 }}>
                    {timeAgo(room.last_time)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <p style={{
                    margin: 0, fontSize: '0.82rem',
                    color: room.unread_count > 0 ? '#94a3b8' : '#475569',
                    fontWeight: room.unread_count > 0 ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {room.is_sent && <span style={{ color: '#475569', marginRight: '4px' }}>나:</span>}
                    {room.last_message}
                  </p>
                  {room.unread_count > 0 && (
                    <span style={{ background: '#7c3aed', color: '#fff', borderRadius: '50%', minWidth: '20px', height: '20px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, padding: '0 4px' }}>
                      {room.unread_count > 99 ? '99+' : room.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </SidebarLayout>
  );
}