'use client';

// src/app/messages/[username]/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

interface Message {
  id:          string;
  sender_id:   string;
  receiver_id: string;
  content:     string;
  is_read:     boolean;
  created_at:  string;
}

interface Profile {
  id:           string;
  username:     string;
  display_name: string;
  avatar_url:   string;
}

function timeStr(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function Avatar({ url, name, size = 36 }: { url?: string; name?: string; size?: number }) {
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

export default function DMChatPage() {
  const params   = useParams<{ username: string }>();
  const username = params?.username ?? '';
  const router   = useRouter();
  const supabase = createClient();

  const [myId,     setMyId]     = useState<string | null>(null);
  const [partner,  setPartner]  = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myListChRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ptListChRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myIdRef      = useRef<string | null>(null);
  const partnerRef   = useRef<Profile | null>(null);

  useEffect(() => {
    if (!username) return;

    // ✅ 비동기 완료 전에 즉시 동기 등록 → 새로고침 시 뱃지 차단
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('active_dm_username', username);
    }

    let mounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      setMyId(user.id);
      myIdRef.current = user.id;

      const { data: prof } = await supabase
        .from('profiles').select('id, username, display_name, avatar_url')
        .eq('username', username).maybeSingle();
      if (!prof || !mounted) { router.replace('/messages'); return; }
      setPartner(prof);
      partnerRef.current = prof;

      // 채팅방 입장 등록 (알림 차단용)
      const registerActive = () =>
        fetch('/api/dm-room-active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partner_id: prof.id }),
        });
      await registerActive();
      // 25초마다 갱신 (서버 30초 TTL 유지)
      heartbeatRef.current = setInterval(registerActive, 25_000);

      const { data: msgs } = await supabase
        .from('direct_messages').select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${prof.id}),and(sender_id.eq.${prof.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(100);
      if (mounted) { setMessages(msgs ?? []); setLoading(false); }

      await supabase.from('direct_messages')
        .update({ is_read: true })
        .eq('sender_id', prof.id)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (!mounted) return;

      // ── Realtime 채널 구독
      // 이미 존재하는 채널 있으면 먼저 제거
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      // messages-list 채널 구독 (broadcast send를 위해 반드시 subscribe 필요)
      if (myListChRef.current) supabase.removeChannel(myListChRef.current);
      if (ptListChRef.current) supabase.removeChannel(ptListChRef.current);
      myListChRef.current = supabase.channel(`messages-list-${user.id}`).subscribe();
      ptListChRef.current = supabase.channel(`messages-list-${prof.id}`).subscribe();

      const roomId  = [user.id, prof.id].sort().join('-');
      const channel = supabase.channel(`dm-${roomId}`);

      // ✅ subscribe() 전에 모든 콜백 등록
      channel
        .on('broadcast', { event: 'new-message' }, ({ payload }) => {
          const msg = payload as Message;
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.sender_id !== user.id) {
            supabase.from('direct_messages').update({ is_read: true }).eq('id', msg.id);
          }
        })

        .subscribe();

      channelRef.current = channel;
    };

    init();

    return () => {
      mounted = false;
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      // 채팅방 퇴장 등록
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('active_dm_username');
      }
      fetch('/api/dm-room-active', { method: 'DELETE' });
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (myListChRef.current) { supabase.removeChannel(myListChRef.current); myListChRef.current = null; }
      if (ptListChRef.current) { supabase.removeChannel(ptListChRef.current); ptListChRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [messages]);

  const handleSend = async () => {
    const myId   = myIdRef.current;
    const partner = partnerRef.current;
    if (!input.trim() || sending || !myId || !partner) return;
    setSending(true);
    const text = input.trim();
    setInput('');

    const { data: msg, error } = await supabase
      .from('direct_messages')
      .insert({ sender_id: myId, receiver_id: partner.id, content: text })
      .select().single();

    if (!error && msg) {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);

      // ✅ 새 channel() 호출 대신 이미 구독된 channelRef 사용
      if (channelRef.current) {
        await channelRef.current.send({
          type:    'broadcast',
          event:   'new-message',
          payload: msg,
        });
      }
      // 메시지 목록 페이지 실시간 업데이트용 broadcast (구독된 채널 사용)
      if (myListChRef.current) {
        await myListChRef.current.send({ type: 'broadcast', event: 'dm-update', payload: msg });
      }
      if (ptListChRef.current) {
        await ptListChRef.current.send({ type: 'broadcast', event: 'dm-update', payload: msg });
      }
    }
    setSending(false);
  };

  // 날짜 구분
  const getDateLabel = (dateStr: string) => {
    const d    = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return '오늘';
    if (diff === 1) return '어제';
    return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;
  };

  const grouped: { label: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const label = getDateLabel(msg.created_at);
    const last  = grouped[grouped.length - 1];
    if (last?.label === label) last.messages.push(msg);
    else grouped.push({ label, messages: [msg] });
  });

  if (loading) return (
    <SidebarLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #1a1830', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
      </div>
    </SidebarLayout>
  );

  return (
    <SidebarLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '700px', margin: '0 auto' }}>

        {/* ── 헤더 ── */}
        <div style={{
          borderBottom: '1px solid #0f0f22', padding: '13px 20px',
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(6,6,16,0.95)', backdropFilter: 'blur(16px)',
          flexShrink: 0, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <button
            onClick={() => router.back()}
            style={{ background: '#12112a', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: '7px 10px', borderRadius: '10px', lineHeight: 1, fontFamily: 'inherit' }}
          >←</button>
          <Link href={`/profile/${username}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar url={partner?.avatar_url} name={partner?.display_name} size={38} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#c4b5fd', letterSpacing: '-0.01em' }}>{partner?.display_name}</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#2d2b50', marginTop: '1px' }}>@{username}</p>
            </div>
          </Link>
        </div>

        {/* ── 메시지 목록 ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: '64px' }}>
              <p style={{ fontSize: '2.5rem', margin: '0 0 14px' }}>💬</p>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#2d2b50', fontWeight: 600 }}>
                {partner?.display_name}님과 대화를 시작해보세요!
              </p>
            </div>
          ) : (
            grouped.map(group => (
              <div key={group.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 12px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#0f0f22' }} />
                  <span style={{ fontSize: '0.7rem', color: '#1e1c3a', flexShrink: 0 }}>{group.label}</span>
                  <div style={{ flex: 1, height: '1px', background: '#0f0f22' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {group.messages.map((msg, i) => {
                    const isMe       = msg.sender_id === myId;
                    const prev       = group.messages[i - 1];
                    const showAvatar = !isMe && prev?.sender_id !== msg.sender_id;
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                        {!isMe && (
                          <div style={{ width: 30, flexShrink: 0 }}>
                            {showAvatar && <Avatar url={partner?.avatar_url} name={partner?.display_name} size={28} />}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '5px', maxWidth: '68%' }}>
                          <div style={{
                            background:   isMe ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#12112a',
                            color:        '#e2e8f0',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            padding:      '10px 14px',
                            fontSize:     '0.88rem', lineHeight: 1.65,
                            wordBreak:    'break-word',
                            boxShadow:    isMe ? '0 2px 8px rgba(124,58,237,0.25)' : 'none',
                          }}>
                            {msg.content}
                          </div>
                          <span suppressHydrationWarning style={{ fontSize: '0.62rem', color: '#1e1c3a', flexShrink: 0, marginBottom: '4px' }}>
                            {timeStr(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── 입력창 ── */}
        <div style={{
          borderTop: '1px solid #0f0f22', padding: '12px 20px 16px',
          background: '#08081a', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="메시지를 입력하세요..."
              rows={1}
              style={{
                flex: 1, background: '#0d0d1f', border: '1.5px solid #1a1830',
                borderRadius: '20px', padding: '11px 18px', color: '#c4b5fd',
                fontSize: '0.88rem', outline: 'none', resize: 'none',
                fontFamily: 'inherit', maxHeight: '120px', overflowY: 'auto',
                lineHeight: 1.55, transition: 'border-color 0.15s',
              }}
              onFocus={e  => { e.target.style.borderColor = '#7c3aed44'; }}
              onBlur={e   => { e.target.style.borderColor = '#1a1830'; }}
              onInput={e  => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              style={{
                width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
                background: input.trim() && !sending ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : '#12112a',
                color:      input.trim() && !sending ? '#fff' : '#2d2b50',
                fontSize:   '1rem', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: input.trim() && !sending ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
                transition: 'all 0.15s',
              }}
            >{sending ? '⏳' : '↑'}</button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}