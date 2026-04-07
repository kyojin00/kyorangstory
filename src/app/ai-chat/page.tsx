'use client';

// src/app/ai-chat/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { EMOTION_COLOR } from '@/types/story.types';

interface Message {
  role:    'user' | 'assistant';
  content: string;
}

interface Chat {
  id:         string;
  emotion:    string | null;
  messages:   Message[];
  created_at: string;
  updated_at: string;
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

// 오른쪽 대화 목록 패널
function ChatHistoryPanel({
  chats,
  activeChat,
  loading,
  onOpen,
  onDelete,
  onNew,
}: {
  chats:       Chat[];
  activeChat:  Chat | null;
  loading:     boolean;
  onOpen:      (chat: Chat) => void;
  onDelete:    (chatId: string) => void;
  onNew:       () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid #1e1b3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>대화 기록</p>
        <button onClick={onNew} style={{ background: '#7c3aed', border: 'none', borderRadius: '8px', padding: '5px 10px', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
          + 새 대화
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '20px', fontSize: '0.82rem' }}>불러오는 중...</p>
        ) : chats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#334155' }}>
            <p style={{ fontSize: '1.3rem', margin: '0 0 6px' }}>💭</p>
            <p style={{ fontSize: '0.78rem' }}>아직 대화가 없어요</p>
          </div>
        ) : chats.map(chat => {
          const firstMsg = chat.messages?.find(m => m.role === 'user')?.content ?? '새 대화';
          const isActive = activeChat?.id === chat.id;
          return (
            <div
              key={chat.id}
              onClick={() => onOpen(chat)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                borderBottom: '1px solid #1e1b3a',
                background: isActive ? '#1e1b3a' : 'transparent',
                transition: 'background 0.1s', position: 'relative',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#0f0f1f'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                {chat.emotion && (
                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '6px', background: (EMOTION_COLOR as any)[chat.emotion] + '33', color: (EMOTION_COLOR as any)[chat.emotion], border: `1px solid ${(EMOTION_COLOR as any)[chat.emotion]}44` }}>
                    {chat.emotion}
                  </span>
                )}
                <span style={{ fontSize: '0.68rem', color: '#475569', marginLeft: 'auto' }}>{timeAgo(chat.updated_at)}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {firstMsg}
              </p>
              <button
                onClick={e => { e.stopPropagation(); onDelete(chat.id); }}
                style={{ position: 'absolute', top: '6px', right: '8px', background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', fontSize: '0.72rem', padding: '2px 4px', opacity: 0, transition: 'opacity 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#334155'; }}
                ref={el => {
                  const parent = el?.parentElement;
                  if (!parent) return;
                  parent.addEventListener('mouseenter', () => { if (el) el.style.opacity = '1'; });
                  parent.addEventListener('mouseleave', () => { if (el) el.style.opacity = '0'; });
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AiChatPage() {
  const [chats,      setChats]      = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const router    = useRouter();
  const supabase  = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }
      const res  = await fetch('/api/ai-chat');
      const data = await res.json();
      setChats(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [messages]);

  const startNewChat = () => {
    setActiveChat(null);
    setMessages([]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const openChat = (chat: Chat) => {
    setActiveChat(chat);
    setMessages(chat.messages ?? []);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    const res  = await fetch('/api/ai-chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, chat_id: activeChat?.id ?? null }),
    });
    const data = await res.json();

    if (res.ok) {
      const aiMsg: Message = { role: 'assistant', content: data.reply };
      setMessages(prev => [...prev, aiMsg]);

      const updatedChat: Chat = {
        id:         data.chat_id,
        emotion:    data.emotion ?? activeChat?.emotion ?? null,
        messages:   [...(activeChat?.messages ?? []), userMsg, aiMsg],
        created_at: activeChat?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (!activeChat) {
        setActiveChat(updatedChat);
        setChats(prev => [updatedChat, ...prev]);
      } else {
        setActiveChat(updatedChat);
        setChats(prev => prev.map(c => c.id === updatedChat.id ? updatedChat : c));
      }
    }
    setSending(false);
  };

  const handleDelete = async (chatId: string) => {
    if (!confirm('이 대화를 삭제할까요?')) return;
    await fetch(`/api/ai-chat?id=${chatId}`, { method: 'DELETE' });
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChat?.id === chatId) { setActiveChat(null); setMessages([]); }
  };

  // 오른쪽 패널에 대화 목록
  const rightPanel = (
    <ChatHistoryPanel
      chats={chats}
      activeChat={activeChat}
      loading={loading}
      onOpen={openChat}
      onDelete={handleDelete}
      onNew={startNewChat}
    />
  );

  return (
    <SidebarLayout rightPanel={rightPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        {/* 채팅 헤더 */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e1b3a', display: 'flex', alignItems: 'center', gap: '12px', background: '#080810', flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
            💭
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#e2e8f0' }}>교랑 상담사</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#22c55e' }}>● 언제든 이야기해요</p>
          </div>
          <button
            onClick={startNewChat}
            style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #1e1b3a', borderRadius: '20px', padding: '6px 14px', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1b3a'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
          >
            + 새 대화
          </button>
        </div>

        {/* 메시지 목록 - 중앙 정렬 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: '80px' }}>
                <p style={{ fontSize: '3rem', margin: '0 0 20px' }}>💜</p>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#a78bfa', margin: '0 0 10px' }}>안녕하세요! 교랑 상담사예요</p>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: '#64748b', maxWidth: '340px', margin: '0 auto' }}>
                  오늘 어떤 하루를 보내셨나요?<br />
                  무슨 이야기든 편하게 털어놓으세요.<br />
                  판단 없이 들을게요 🌙
                </p>
                {/* 빠른 시작 버튼 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '28px' }}>
                  {['오늘 하루가 힘들었어요', '누군가와 이야기하고 싶어요', '요즘 불안한 것 같아요', '그냥 답답해요'].map(q => (
                    <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }} style={{
                      padding: '8px 16px', borderRadius: '20px', border: '1px solid #1e1b3a',
                      background: 'transparent', color: '#64748b', fontSize: '0.82rem',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1b3a'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: '10px', alignItems: 'flex-end',
                  }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                        💭
                      </div>
                    )}
                    <div style={{
                      maxWidth: '72%',
                      background: msg.role === 'user' ? '#7c3aed' : '#1e1b3a',
                      color: '#e2e8f0',
                      borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      padding: '12px 18px',
                      fontSize: '0.9rem', lineHeight: 1.7,
                      wordBreak: 'break-word',
                      boxShadow: '0 2px 8px #0003',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {/* 타이핑 애니메이션 */}
                {sending && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>💭</div>
                    <div style={{ background: '#1e1b3a', borderRadius: '20px 20px 20px 4px', padding: '14px 18px' }}>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7c3aed', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* 입력창 */}
        <div style={{ borderTop: '1px solid #1e1b3a', padding: '14px 24px 18px', background: '#080810', flexShrink: 0 }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="오늘 어떤 하루였나요?..."
              rows={1}
              style={{
                flex: 1, background: '#0f0f1f', border: '1px solid #1e1b3a',
                borderRadius: '16px', padding: '12px 18px', color: '#e2e8f0',
                fontSize: '0.9rem', outline: 'none', resize: 'none',
                fontFamily: 'sans-serif', lineHeight: 1.5, maxHeight: '120px',
                overflowY: 'auto', transition: 'border-color 0.15s',
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
                background: input.trim() && !sending ? '#7c3aed' : '#1e1b3a',
                border: 'none', borderRadius: '14px', padding: '12px 22px',
                color: input.trim() && !sending ? '#fff' : '#475569',
                fontSize: '0.875rem', fontWeight: 700, flexShrink: 0,
                cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              {sending ? '...' : '전송'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </SidebarLayout>
  );
}