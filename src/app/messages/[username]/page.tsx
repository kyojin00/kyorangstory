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
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function Avatar({ url, name, size = 36 }: { url?: string; name?: string; size?: number }) {
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

export default function DMChatPage() {
  const params   = useParams<{ username: string }>();
  const username = params?.username ?? '';
  const router   = useRouter();
  const supabase = createClient();

  const [myId,      setMyId]      = useState<string | null>(null);
  const [partner,   setPartner]   = useState<Profile | null>(null);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [isOnline,  setIsOnline]  = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const channelRef  = useRef<any>(null);

  useEffect(() => {
    if (!username) return;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }
      setMyId(user.id);

      // 상대방 프로필
      const { data: prof } = await supabase
        .from('profiles').select('id, username, display_name, avatar_url')
        .eq('username', username).maybeSingle();
      if (!prof) { router.replace('/messages'); return; }
      setPartner(prof);

      // 기존 메시지 로드
      const { data: msgs } = await supabase
        .from('direct_messages').select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${prof.id}),and(sender_id.eq.${prof.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(100);
      setMessages(msgs ?? []);
      setLoading(false);

      // 읽음 처리
      await supabase.from('direct_messages')
        .update({ is_read: true })
        .eq('sender_id', prof.id)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      // ── Supabase Broadcast 실시간 구독
      const roomId = [user.id, prof.id].sort().join('-');
      const channel = supabase.channel(`dm-${roomId}`);

      channel
        .on('broadcast', { event: 'new-message' }, ({ payload }) => {
          const msg = payload as Message;
          setMessages(prev => {
            // 중복 방지
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // 상대방 메시지 읽음 처리
          if (msg.sender_id !== user.id) {
            supabase.from('direct_messages')
              .update({ is_read: true })
              .eq('id', msg.id);
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          setIsOnline(Object.keys(state).length > 1);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
          }
        });

      channelRef.current = channel;
    };

    init();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending || !myId || !partner) return;
    setSending(true);
    const text = input.trim();
    setInput('');

    // DB 저장
    const { data: msg, error } = await supabase
      .from('direct_messages')
      .insert({ sender_id: myId, receiver_id: partner.id, content: text })
      .select().single();

    if (!error && msg) {
      // 낙관적 업데이트
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);

      // Broadcast로 상대방에게 실시간 전송
      const roomId = [myId, partner.id].sort().join('-');
      await supabase.channel(`dm-${roomId}`).send({
        type:    'broadcast',
        event:   'new-message',
        payload: msg,
      });
    }
    setSending(false);
  };

  // 날짜 구분선
  const getDateLabel = (dateStr: string) => {
    const d     = new Date(dateStr);
    const today = new Date();
    const diff  = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return '오늘';
    if (diff === 1) return '어제';
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  };

  // 날짜별 그룹
  const grouped: { label: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const label = getDateLabel(msg.created_at);
    const last  = grouped[grouped.length - 1];
    if (last?.label === label) last.messages.push(msg);
    else grouped.push({ label, messages: [msg] });
  });

  if (loading) return (
    <SidebarLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontFamily: 'sans-serif' }}>불러오는 중...</div>
    </SidebarLayout>
  );

  return (
    <SidebarLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        {/* 헤더 */}
        <div style={{ borderBottom: '1px solid #1e1b3a', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: '#080810', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '1.2rem', padding: 0, lineHeight: 1 }}>←</button>
          <Link href={`/profile/${username}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar url={partner?.avatar_url} name={partner?.display_name} size={38} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0' }}>{partner?.display_name}</p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: isOnline ? '#22c55e' : '#475569' }}>
                {isOnline ? '● 온라인' : `@${username}`}
              </p>
            </div>
          </Link>
        </div>

        {/* 메시지 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: '60px', color: '#334155' }}>
              <p style={{ fontSize: '2rem', margin: '0 0 12px' }}>💬</p>
              <p style={{ fontSize: '0.875rem' }}>{partner?.display_name}님과 대화를 시작해보세요!</p>
            </div>
          ) : (
            grouped.map(group => (
              <div key={group.label}>
                {/* 날짜 구분선 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 12px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#1e1b3a' }} />
                  <span style={{ fontSize: '0.72rem', color: '#334155', flexShrink: 0 }}>{group.label}</span>
                  <div style={{ flex: 1, height: '1px', background: '#1e1b3a' }} />
                </div>

                {/* 메시지들 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {group.messages.map((msg, i) => {
                    const isMe   = msg.sender_id === myId;
                    const prev   = group.messages[i - 1];
                    const showAvatar = !isMe && prev?.sender_id !== msg.sender_id;

                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px', marginBottom: '2px' }}>
                        {/* 상대방 아바타 */}
                        {!isMe && (
                          <div style={{ width: 32, flexShrink: 0 }}>
                            {showAvatar && <Avatar url={partner?.avatar_url} name={partner?.display_name} size={30} />}
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '6px', maxWidth: '70%' }}>
                          <div style={{
                            background:   isMe ? '#7c3aed' : '#1e1b3a',
                            color:        '#e2e8f0',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            padding:      '10px 14px',
                            fontSize:     '0.9rem', lineHeight: 1.6,
                            wordBreak:    'break-word',
                          }}>
                            {msg.content}
                          </div>
                          <span style={{ fontSize: '0.65rem', color: '#334155', flexShrink: 0, marginBottom: '4px' }}>
                            {timeStr(msg.created_at)}
                            {isMe && <span style={{ marginLeft: '3px', color: msg.is_read ? '#7c3aed' : '#334155' }}>{msg.is_read ? '읽음' : '•'}</span>}
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

        {/* 입력창 */}
        <div style={{ borderTop: '1px solid #1e1b3a', padding: '12px 20px 16px', background: '#080810', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="메시지를 입력하세요..."
              rows={1}
              style={{
                flex: 1, background: '#0f0f1f', border: '1px solid #1e1b3a',
                borderRadius: '22px', padding: '11px 18px', color: '#e2e8f0',
                fontSize: '0.9rem', outline: 'none', resize: 'none',
                fontFamily: 'sans-serif', maxHeight: '120px', overflowY: 'auto',
                lineHeight: 1.5, transition: 'border-color 0.15s',
              }}
              onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={e   => { e.target.style.borderColor = '#1e1b3a'; }}
              onInput={e => {
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
                background: input.trim() && !sending ? '#7c3aed' : '#1e1b3a',
                color:      input.trim() && !sending ? '#fff'    : '#475569',
                fontSize:   '1.1rem', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {sending ? '⏳' : '↑'}
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}