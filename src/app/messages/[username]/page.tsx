'use client';

// src/app/messages/[username]/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
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

interface OtherProfile {
  id:           string;
  username:     string;
  display_name: string;
  avatar_url:   string;
}

function Avatar({ url, name, size = 32 }: { url?: string; name?: string; size?: number }) {
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

export default function DMPage() {
  const params   = useParams<{ username: string }>();
  const username = params?.username ?? '';

  const [myId,    setMyId]    = useState<string | null>(null);
  const [other,   setOther]   = useState<OtherProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,   setInput]   = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase  = createClient();

  // 스크롤 아래로
  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => {
    if (!username) return;

    const init = async () => {
      // 내 user id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);

      // 대화 내역 로드
      const res  = await fetch(`/api/messages/${username}`);
      const data = await res.json();
      if (res.ok) {
        setOther(data.other);
        setMessages(data.messages ?? []);
      }
      setLoading(false);
      scrollToBottom();
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Supabase Realtime 구독
  useEffect(() => {
    if (!myId || !other) return;

    const channel = supabase
      .channel(`dm-${[myId, other.id].sort().join('-')}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as Message;
          const isRelevant =
            (msg.sender_id === myId   && msg.receiver_id === other.id) ||
            (msg.sender_id === other.id && msg.receiver_id === myId);
          if (isRelevant) {
            setMessages(prev => [...prev, msg]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, other]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    const res = await fetch(`/api/messages/${username}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessages(prev => [...prev, data]);
      scrollToBottom();
    }
    setSending(false);
  };

  if (loading) return (
    <SidebarLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontFamily: 'sans-serif' }}>
        불러오는 중...
      </div>
    </SidebarLayout>
  );

  return (
    <SidebarLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '680px', margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{
          borderBottom: '1px solid #1e1b3a', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '12px',
          background: '#080810', flexShrink: 0,
        }}>
          <Link href="/messages" style={{ color: '#a78bfa', fontSize: '1.2rem', textDecoration: 'none', lineHeight: 1 }}>←</Link>
          {other && (
            <>
              <Link href={`/profile/${other.username}`}>
                <Avatar url={other.avatar_url} name={other.display_name} size={36} />
              </Link>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0' }}>{other.display_name}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>@{other.username}</p>
              </div>
            </>
          )}
        </div>

        {/* 메시지 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 && (
            <p style={{ textAlign: 'center', color: '#334155', marginTop: '40px', fontSize: '0.875rem' }}>
              첫 번째 메시지를 보내보세요!
            </p>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_id === myId;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: '8px',
                }}
              >
                {!isMe && <Avatar url={other?.avatar_url} name={other?.display_name} size={28} />}
                <div style={{
                  maxWidth: '70%',
                  background: isMe ? '#7c3aed' : '#1e1b3a',
                  color: '#e2e8f0',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div style={{
          borderTop: '1px solid #1e1b3a', padding: '12px 16px',
          display: 'flex', gap: '8px', background: '#080810', flexShrink: 0,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="메시지 보내기..."
            style={{
              flex: 1, background: '#1e1b3a', border: '1px solid #2d2b4a',
              borderRadius: '24px', padding: '10px 16px', color: '#e2e8f0',
              fontSize: '0.9rem', outline: 'none', fontFamily: 'sans-serif',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{
              background: input.trim() && !sending ? '#7c3aed' : '#1e1b3a',
              border: 'none', borderRadius: '50%', width: '42px', height: '42px',
              color: '#fff', fontSize: '1rem', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}
          >
            {sending ? '...' : '➤'}
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
}