'use client';

// src/app/messages/page.tsx

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

interface ChatRoom {
  partner_id:       string;
  partner_username: string;
  partner_name:     string;
  partner_avatar:   string;
  last_message:     string;
  last_time:        string;
  unread_count:     number;
  is_sent:          boolean;
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
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #1a1830' }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: '#fff' }}>
      {(name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default function MessagesPage() {
  const [rooms,      setRooms]      = useState<ChatRoom[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [totalUnread, setTotalUnread] = useState(0);
  const myIdRef      = useRef<string | null>(null);
  const profileCache = useRef<Record<string, { username: string; display_name: string; avatar_url: string }>>({});
  const channelRef   = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const router   = useRouter();
  const supabase = createClient();

  // rooms를 ref로도 유지 (realtime 핸들러 클로저용)
  const roomsRef = useRef<ChatRoom[]>([]);
  const setRoomsSync = (fn: (prev: ChatRoom[]) => ChatRoom[]) => {
    setRooms(prev => {
      const next = fn(prev);
      roomsRef.current = next;
      return next;
    });
  };

  const loadRooms = async (uid: string) => {
    // 사이드바와 동일: DB에서 직접 미읽음 수 조회
    const { count } = await supabase
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', uid)
      .eq('is_read', false);
    setTotalUnread(count ?? 0);

    const { data: msgs } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false });

    if (!msgs?.length) { setLoading(false); return; }

    const roomMap = new Map<string, ChatRoom>();
    for (const msg of msgs) {
      const partnerId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id;
      if (!roomMap.has(partnerId)) {
        roomMap.set(partnerId, {
          partner_id:       partnerId,
          partner_username: '',
          partner_name:     '',
          partner_avatar:   '',
          last_message:     msg.content,
          last_time:        msg.created_at,
          unread_count:     0,
          is_sent:          msg.sender_id === uid,
        });
      }
      if (msg.receiver_id === uid && !msg.is_read) {
        const room = roomMap.get(partnerId)!;
        room.unread_count++;
        roomMap.set(partnerId, room);
      }
    }

    const partnerIds = [...roomMap.keys()];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', partnerIds);

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
    // 캐시 업데이트
    Object.assign(profileCache.current, profileMap);

    const result: ChatRoom[] = [];
    for (const [id, room] of roomMap) {
      const prof = profileMap[id];
      if (prof) result.push({ ...room, partner_username: prof.username ?? '', partner_name: prof.display_name ?? '알 수 없음', partner_avatar: prof.avatar_url ?? '' });
    }
    result.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());

    roomsRef.current = result;
    setRooms(result);
    setLoading(false);
  };

  const handleNewMessage = async (msg: {
    id: string; sender_id: string; receiver_id: string;
    content: string; created_at: string; is_read: boolean;
  }) => {
    const uid = myIdRef.current;
    if (!uid) return;
    if (msg.sender_id !== uid && msg.receiver_id !== uid) return;

    const partnerId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id;
    const isSent    = msg.sender_id === uid;

    // 파트너 프로필 (캐시 우선)
    let prof = profileCache.current[partnerId];
    if (!prof) {
      const { data } = await supabase
        .from('profiles').select('id, username, display_name, avatar_url')
        .eq('id', partnerId).maybeSingle();
      if (data) { profileCache.current[partnerId] = data; prof = data; }
    }
    if (!prof) return;

    setRoomsSync(prev => {
      const existing = prev.find(r => r.partner_id === partnerId);
      const updated: ChatRoom = existing
        ? {
            ...existing,
            last_message: msg.content,
            last_time:    msg.created_at,
            is_sent:      isSent,
            unread_count: !isSent && !msg.is_read
              ? existing.unread_count + 1
              : existing.unread_count,
          }
        : {
            partner_id:       partnerId,
            partner_username: prof.username ?? '',
            partner_name:     prof.display_name ?? '알 수 없음',
            partner_avatar:   prof.avatar_url ?? '',
            last_message:     msg.content,
            last_time:        msg.created_at,
            unread_count:     !isSent && !msg.is_read ? 1 : 0,
            is_sent:          isSent,
          };

      const rest = prev.filter(r => r.partner_id !== partnerId);
      return [updated, ...rest];
    });
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }   // 로그인 안 된 경우
      if (!mounted) return;                                           // 언마운트된 경우 조용히 종료
      myIdRef.current = user.id;

      await loadRooms(user.id);
      if (!mounted) return;

      // ── Realtime: 내 DM 변경 구독
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // broadcast 방식 — RLS 필터 문제 없이 작동
      const channel = supabase
        .channel(`messages-list-${user.id}`)
        .on('broadcast', { event: 'dm-update' }, ({ payload }) => {
          if (mounted) handleNewMessage(payload as any);
        })
        .subscribe();

      channelRef.current = channel;
    };

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered    = rooms.filter(r =>
    r.partner_name.toLowerCase().includes(search.toLowerCase()) ||
    r.partner_username.toLowerCase().includes(search.toLowerCase())
  );


  return (
    <SidebarLayout>
      <div style={{ maxWidth: '660px', margin: '0 auto' }}>

        {/* ── 헤더 ── */}
        <div style={{
          padding: '14px 24px', position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(6,6,16,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #0f0f22',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em' }}>메시지</h1>
              {totalUnread > 0 && (
                <span style={{ background: '#7c3aed', color: '#fff', borderRadius: '999px', padding: '2px 9px', fontSize: '0.72rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(124,58,237,0.4)' }}>
                  {totalUnread}
                </span>
              )}
            </div>
          </div>

          {/* 검색 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: '#0d0d1f', border: '1.5px solid #1a1830',
            borderRadius: '14px', padding: '9px 16px', transition: 'border-color 0.2s',
          }}
            onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed44'; }}
            onBlurCapture={e  => { (e.currentTarget as HTMLElement).style.borderColor = '#1a1830'; }}
          >
            <span style={{ color: '#2d2b50', fontSize: '0.88rem' }}>🔎</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="대화 검색..."
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#c4b5fd', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', color: '#2d2b50', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px', borderRadius: '6px', fontFamily: 'inherit' }}>✕</button>
            )}
          </div>
        </div>

        {/* ── 목록 ── */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '64px 0', color: '#2d2b50', fontSize: '0.84rem' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #1a1830', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
            <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
            불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <p style={{ fontSize: '2.5rem', margin: '0 0 14px' }}>💬</p>
            <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#2d2b50', fontWeight: 600 }}>
              {search ? `"${search}" 검색 결과가 없어요` : '아직 대화가 없어요'}
            </p>
            {!search && (
              <Link href="/search" style={{
                display: 'inline-block', marginTop: '16px',
                background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                color: '#fff', borderRadius: '12px', padding: '9px 22px',
                textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700,
                boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
              }}>
                🔎 사람 찾기
              </Link>
            )}
          </div>
        ) : filtered.map(room => (
          <RoomRow key={room.partner_id} room={room} />
        ))}
      </div>
    </SidebarLayout>
  );
}

function RoomRow({ room }: { room: ChatRoom }) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={`/messages/${room.partner_username}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '14px 24px', borderBottom: '1px solid #0f0f22',
          background: hov ? '#09091a' : room.unread_count > 0 ? '#0a0818' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <Avatar url={room.partner_avatar} name={room.partner_name} size={48} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: room.unread_count > 0 ? 800 : 600, fontSize: '0.9rem', color: '#c4b5fd' }}>
              {room.partner_name}
            </span>
            <span suppressHydrationWarning style={{ fontSize: '0.7rem', color: room.unread_count > 0 ? '#7c3aed' : '#1e1c3a', flexShrink: 0 }}>
              {timeAgo(room.last_time)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <p style={{
              margin: 0, fontSize: '0.82rem',
              color: room.unread_count > 0 ? '#7c6fa0' : '#2d2b50',
              fontWeight: room.unread_count > 0 ? 600 : 400,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {room.is_sent && <span style={{ color: '#1e1c3a', marginRight: '4px' }}>나:</span>}
              {room.last_message}
            </p>
            {room.unread_count > 0 && (
              <span style={{
                background: '#7c3aed', color: '#fff', borderRadius: '999px',
                minWidth: '20px', height: '20px', fontSize: '0.62rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, flexShrink: 0, padding: '0 5px',
                boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
              }}>
                {room.unread_count > 99 ? '99+' : room.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}