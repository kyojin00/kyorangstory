'use client';

// src/app/comfort/page.tsx

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '@/components/SidebarLayout';

const EMOTIONS = [
  { key: '우울',    icon: '😔', color: '#6366f1', bg: '#6366f115' },
  { key: '불안',    icon: '😰', color: '#f59e0b', bg: '#f59e0b15' },
  { key: '외로움',  icon: '🥺', color: '#8b5cf6', bg: '#8b5cf615' },
  { key: '분노',    icon: '😤', color: '#ef4444', bg: '#ef444415' },
  { key: '허무함',  icon: '😶', color: '#64748b', bg: '#64748b15' },
  { key: '스트레스', icon: '😩', color: '#f97316', bg: '#f9731615' },
];

// 폴백 메시지 (API 연동 전)
const FALLBACK: Record<string, string[]> = {
  우울: [
    '지금 이 감정도 결국 지나가요. 버텨줘서 고마워요.',
    '아무것도 하기 싫은 날도 괜찮아요. 그냥 숨만 쉬어도 충분해요.',
    '우울함은 당신이 약해서가 아니에요. 그냥 지쳐서 그런 거예요.',
    '오늘 하루도 버텼잖아요. 그것만으로도 충분히 잘한 거예요.',
    '혼자 삭히지 않아도 돼요. 여기 있을게요.',
  ],
  불안: [
    '지금 이 순간에 집중해봐요. 지금 당장은 괜찮아요.',
    '불안은 미래를 너무 걱정해서 생기는 거예요. 지금 이 순간은 안전해요.',
    '숨을 천천히 쉬어봐요. 들이쉬고... 내쉬고... 괜찮아질 거예요.',
    '걱정하는 것들의 90%는 실제로 일어나지 않는대요.',
    '불안해도 괜찮아요. 불안해하면서도 앞으로 나아갈 수 있어요.',
  ],
  외로움: [
    '혼자라고 느껴질 때가 제일 힘들죠. 지금 당신 곁에 있을게요.',
    '외로움을 느낀다는 건 관계를 소중히 여긴다는 뜻이에요.',
    '지금 이 순간에도 비슷한 감정을 느끼는 사람이 분명 있어요.',
    '혼자여도 괜찮아요. 당신은 충분히 완전한 사람이에요.',
    '이 글을 읽는 누군가도 지금 당신과 같은 감정이에요.',
  ],
  분노: [
    '화가 나는 건 당연해요. 당신의 감정은 틀리지 않았어요.',
    '지금 많이 억울하겠다. 그 감정 충분히 느껴도 돼요.',
    '화를 내도 되는 상황이에요. 당신이 이상한 게 아니에요.',
    '분노는 내가 중요하게 여기는 것이 침해당했다는 신호예요.',
    '깊게 숨 한 번 쉬어봐요. 당신의 분노는 정당해요.',
  ],
  허무함: [
    '왜 사는지 모르겠는 날도 있어요. 그래도 여기 있어줘서 고마워요.',
    '허무함은 뭔가 의미 있는 것을 원한다는 신호일 수 있어요.',
    '지금 당장 모든 게 의미있을 필요는 없어요.',
    '그냥 멍하니 있어도 괜찮은 날이에요.',
    '허무하다는 감정, 솔직하게 느껴봐요. 억누를 필요 없어요.',
  ],
  스트레스: [
    '지금 너무 많은 걸 짊어지고 있는 거 아닌가요? 잠깐 내려놓아요.',
    '열심히 살고 있다는 증거예요. 잠깐 쉬어가도 돼요.',
    '완벽하지 않아도 괜찮아요. 그냥 지금 이 순간만 생각해요.',
    '오늘 하루도 수고했어요. 진심으로.',
    '스트레스받는 상황이 문제인 거지, 당신이 약한 게 아니에요.',
  ],
};

interface ComfortMsg { id: string; message: string; emotion: string; created_at: string; }

export default function ComfortPage() {
  const [view,          setView]          = useState<'select' | 'message' | 'write'>('select');
  const [selEmotion,    setSelEmotion]    = useState('');
  const [message,       setMessage]       = useState<ComfortMsg | null>(null);
  const [writeText,     setWriteText]     = useState('');
  const [writeEmotion,  setWriteEmotion]  = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [pulling,       setPulling]       = useState(false);
  const [pullAnim,      setPullAnim]      = useState(false);
  const router = useRouter();

  const pullMessage = useCallback(async (emotion: string) => {
    setPulling(true);
    setPullAnim(false);
    try {
      const res  = await fetch(`/api/comfort?emotion=${emotion}`);
      const data = await res.json();
      if (data?.message) {
        setMessage(data);
      } else {
        // 폴백
        const list = FALLBACK[emotion] ?? FALLBACK['우울'];
        const text = list[Math.floor(Math.random() * list.length)];
        setMessage({ id: 'local', message: text, emotion, created_at: new Date().toISOString() });
      }
    } catch {
      const list = FALLBACK[emotion] ?? FALLBACK['우울'];
      const text = list[Math.floor(Math.random() * list.length)];
      setMessage({ id: 'local', message: text, emotion, created_at: new Date().toISOString() });
    }
    setTimeout(() => setPullAnim(true), 50);
    setPulling(false);
    setView('message');
  }, []);

  const handleSubmitMessage = async () => {
    if (!writeText.trim() || !writeEmotion || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/comfort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: writeText.trim(), emotion: writeEmotion }),
      });
    } catch { /* ignore */ }
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => { setSubmitted(false); setWriteText(''); setWriteEmotion(''); setView('select'); }, 2000);
  };

  const em = EMOTIONS.find(e => e.key === selEmotion);

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{
          padding: '14px 24px', position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(6,6,16,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #0f0f22',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <button
            onClick={() => view === 'select' ? router.back() : setView('select')}
            style={{ background: '#12112a', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: '7px 12px', borderRadius: '10px', fontFamily: 'inherit' }}
          >← 뒤로</button>
          <div>
            <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em' }}>🎰 위로 자판기</h1>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#2d2b50', marginTop: '1px' }}>익명 위로 메시지를 뽑아보세요</p>
          </div>
          {view === 'select' && (
            <button
              onClick={() => setView('write')}
              style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: '10px', border: '1px solid #1a1830', background: 'transparent', color: '#3d3660', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#7c3aed44'; el.style.color = '#a78bfa'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1a1830'; el.style.color = '#3d3660'; }}
            >✏️ 위로 쓰기</button>
          )}
        </div>

        <div style={{ padding: '28px 24px' }}>

          {/* ── 감정 선택 ── */}
          {view === 'select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                borderRadius: '20px', padding: '28px', textAlign: 'center',
                background: 'linear-gradient(140deg, #1e1245 0%, #0c0c1e 100%)',
                border: '1px solid rgba(124,58,237,0.18)',
              }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '14px' }}>🎰</div>
                <h2 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: 900, color: '#c4b5fd', letterSpacing: '-0.02em' }}>
                  지금 어떤 감정인가요?
                </h2>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#3d3660', lineHeight: 1.75 }}>
                  감정을 선택하면 다른 사람이 남긴<br />익명 위로 메시지를 뽑아드려요
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {EMOTIONS.map(e => (
                  <EmotionCard
                    key={e.key} emotion={e}
                    selected={selEmotion === e.key}
                    onClick={() => setSelEmotion(e.key)}
                  />
                ))}
              </div>

              <button
                onClick={() => selEmotion && pullMessage(selEmotion)}
                disabled={!selEmotion || pulling}
                style={{
                  padding: '16px', borderRadius: '16px', border: 'none', fontFamily: 'inherit',
                  background: selEmotion ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#0e0e1f',
                  color: selEmotion ? '#fff' : '#2d2b50',
                  fontSize: '1rem', fontWeight: 800, cursor: selEmotion ? 'pointer' : 'not-allowed',
                  boxShadow: selEmotion ? '0 8px 24px rgba(124,58,237,0.35)' : 'none',
                  transition: 'all 0.2s', letterSpacing: '-0.01em',
                }}
              >{pulling ? '뽑는 중...' : '🎰 위로 메시지 뽑기'}</button>
            </div>
          )}

          {/* ── 메시지 결과 ── */}
          {view === 'message' && message && em && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                borderRadius: '24px', padding: '36px 28px', textAlign: 'center',
                background: `linear-gradient(160deg, ${em.color}18 0%, #0c0c1e 100%)`,
                border: `1px solid ${em.color}25`,
                opacity: pullAnim ? 1 : 0,
                transform: pullAnim ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{em.icon}</div>
                <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: em.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {em.key}을 느끼는 당신에게
                </p>
                <blockquote style={{
                  margin: '20px 0', padding: '0 8px',
                  fontSize: '1.08rem', lineHeight: 1.85,
                  color: '#c4b5fd', fontWeight: 500, fontStyle: 'normal',
                  letterSpacing: '-0.01em',
                }}>
                  "{message.message}"
                </blockquote>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#2d2b50' }}>— 익명의 누군가가 남긴 위로</p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => pullMessage(selEmotion)}
                  style={{
                    flex: 1, padding: '13px', borderRadius: '14px', border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                    color: '#fff', fontSize: '0.88rem', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                  }}
                >🔄 다른 메시지 뽑기</button>
                <button
                  onClick={() => setView('select')}
                  style={{
                    flex: 1, padding: '13px', borderRadius: '14px',
                    border: '1px solid #1a1830', background: 'transparent',
                    color: '#3d3660', fontSize: '0.88rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >감정 다시 선택</button>
              </div>

              <div style={{ background: '#0c0c1e', border: '1px solid #1a1830', borderRadius: '16px', padding: '18px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 12px', fontSize: '0.83rem', color: '#3d3660', lineHeight: 1.7 }}>
                  나도 누군가에게 위로를 전하고 싶다면?
                </p>
                <button
                  onClick={() => setView('write')}
                  style={{
                    padding: '9px 24px', borderRadius: '12px', border: '1px solid rgba(124,58,237,0.3)',
                    background: 'rgba(124,58,237,0.1)', color: '#a78bfa',
                    fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >💌 위로 메시지 남기기</button>
              </div>
            </div>
          )}

          {/* ── 위로 쓰기 ── */}
          {view === 'write' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💌</div>
                  <h2 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: '#4ade80' }}>위로가 전달됐어요</h2>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#2d2b50' }}>당신의 한 마디가 누군가에게 큰 힘이 될 거예요.</p>
                </div>
              ) : (
                <>
                  <div style={{ background: '#0c0c1e', border: '1px solid #1a1830', borderRadius: '18px', padding: '20px' }}>
                    <p style={{ margin: '0 0 12px', fontSize: '0.72rem', fontWeight: 700, color: '#2d2b50', letterSpacing: '0.06em', textTransform: 'uppercase' }}>어떤 감정에 위로를 보낼까요?</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                      {EMOTIONS.map(e => {
                        const sel = writeEmotion === e.key;
                        return (
                          <button key={e.key} onClick={() => setWriteEmotion(e.key)} style={{
                            padding: '7px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                            background: sel ? e.color + '22' : '#0e0e1f',
                            outline: sel ? `1.5px solid ${e.color}44` : '1.5px solid transparent',
                            color: sel ? e.color : '#3d3660',
                            fontSize: '0.82rem', fontWeight: sel ? 700 : 400,
                            transition: 'all 0.15s', fontFamily: 'inherit',
                          }}>{e.icon} {e.key}</button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={writeText}
                      onChange={e => setWriteText(e.target.value.slice(0, 100))}
                      placeholder="짧은 위로 한 마디를 남겨주세요..."
                      rows={4}
                      style={{
                        width: '100%', background: '#0c0c1e', border: '1.5px solid #1a1830',
                        borderRadius: '16px', padding: '16px 18px', color: '#c4b5fd',
                        fontSize: '0.95rem', lineHeight: 1.8, resize: 'none',
                        outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e  => { e.target.style.borderColor = '#7c3aed44'; }}
                      onBlur={e   => { e.target.style.borderColor = '#1a1830'; }}
                    />
                    <p style={{ position: 'absolute', bottom: '12px', right: '16px', margin: 0, fontSize: '0.7rem', color: '#2d2b50' }}>
                      {writeText.length}/100
                    </p>
                  </div>

                  <div style={{ background: '#0c0c1e', border: '1px solid #1a1830', borderRadius: '14px', padding: '14px 18px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem' }}>🔒</span>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#2d2b50', lineHeight: 1.6 }}>
                      완전 익명으로 전달돼요. 누가 썼는지 절대 알 수 없어요.
                    </p>
                  </div>

                  <button
                    onClick={handleSubmitMessage}
                    disabled={!writeText.trim() || !writeEmotion || submitting}
                    style={{
                      padding: '15px', borderRadius: '16px', border: 'none', fontFamily: 'inherit',
                      background: writeText.trim() && writeEmotion ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#0e0e1f',
                      color: writeText.trim() && writeEmotion ? '#fff' : '#2d2b50',
                      fontSize: '0.95rem', fontWeight: 800,
                      cursor: writeText.trim() && writeEmotion ? 'pointer' : 'not-allowed',
                      boxShadow: writeText.trim() && writeEmotion ? '0 8px 24px rgba(124,58,237,0.35)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >{submitting ? '전달 중...' : '💌 위로 전달하기'}</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

function EmotionCard({ emotion, selected, onClick }: { emotion: typeof EMOTIONS[0]; selected: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '18px 14px', borderRadius: '16px', border: 'none', cursor: 'pointer',
        background: selected ? emotion.color + '22' : hov ? '#12112a' : '#0c0c1e',
        outline: selected ? `2px solid ${emotion.color}55` : hov ? `1px solid ${emotion.color}22` : '1px solid #1a1830',
        transition: 'all 0.18s', fontFamily: 'inherit',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
      }}
    >
      <span style={{ fontSize: '2rem' }}>{emotion.icon}</span>
      <span style={{ fontSize: '0.88rem', fontWeight: selected ? 700 : 500, color: selected ? emotion.color : hov ? '#7c6fa0' : '#3d3660' }}>
        {emotion.key}
      </span>
    </button>
  );
}