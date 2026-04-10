'use client';

// src/app/penpal/page.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '@/components/SidebarLayout';

const EMOTIONS = ['우울', '불안', '외로움', '분노', '허무함', '스트레스', '기쁨', '평온'];
const EMOTION_COLORS: Record<string, string> = {
  우울: '#6366f1', 불안: '#f59e0b', 외로움: '#8b5cf6', 분노: '#ef4444',
  허무함: '#64748b', 스트레스: '#f97316', 기쁨: '#22c55e', 평온: '#06b6d4',
};

interface Letter { id: string; content: string; from_alias: string; created_at: string; is_read: boolean; }
interface PenpalMatch { id: string; partner_alias: string; partner_emotion: string; matched_at: string; letters: Letter[]; status: 'active' | 'ended'; }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return '오늘';
  if (d < 7) return `${d}일 전`;
  return `${Math.floor(d / 7)}주 전`;
}

export default function PenpalPage() {
  const [view,        setView]       = useState<'intro' | 'signup' | 'waiting' | 'matched' | 'write'>('intro');
  const [match,       setMatch]      = useState<PenpalMatch | null>(null);
  const [myEmotions,  setMyEmotions] = useState<string[]>([]);
  const [myAlias,     setMyAlias]    = useState('');
  const [letterText,  setLetterText] = useState('');
  const [sending,     setSending]    = useState(false);
  const [loading,     setLoading]    = useState(true);
  const [submitting,  setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res  = await fetch('/api/penpal');
        const data = await res.json();
        if (data?.status === 'matched') { setMatch(data); setView('matched'); }
        else if (data?.status === 'waiting') { setView('waiting'); }
        else { setView('intro'); }
      } catch { setView('intro'); }
      setLoading(false);
    };
    fetchMatch();
  }, []);

  const handleSignup = async () => {
    if (!myAlias.trim() || myEmotions.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/penpal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: myAlias.trim(), emotions: myEmotions }),
      });
      setView('waiting');
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const handleSendLetter = async () => {
    if (!letterText.trim() || !match || sending) return;
    setSending(true);
    try {
      await fetch(`/api/penpal/${match.id}/letters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: letterText.trim() }),
      });
      setMatch(prev => prev ? {
        ...prev,
        letters: [...prev.letters, { id: Date.now().toString(), content: letterText.trim(), from_alias: '나', created_at: new Date().toISOString(), is_read: false }],
      } : prev);
      setLetterText('');
      setView('matched');
    } catch { /* ignore */ }
    setSending(false);
  };

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
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{
          padding: '14px 24px', position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(6,6,16,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #0f0f22',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <button
            onClick={() => { if (view === 'signup' || view === 'write') setView(view === 'write' ? 'matched' : 'intro'); else router.back(); }}
            style={{ background: '#12112a', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: '7px 12px', borderRadius: '10px', fontFamily: 'inherit' }}
          >← 뒤로</button>
          <div>
            <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em' }}>💌 감정 펜팔</h1>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#2d2b50', marginTop: '1px' }}>비슷한 감정의 누군가와 편지 교환</p>
          </div>
        </div>

        <div style={{ padding: '28px 24px' }}>

          {/* ── 인트로 ── */}
          {view === 'intro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                borderRadius: '24px', padding: '36px 28px', textAlign: 'center',
                background: 'linear-gradient(160deg, #1a0f3d 0%, #2d1b69 50%, #1e1245 100%)',
                border: '1px solid rgba(124,58,237,0.2)',
                boxShadow: '0 16px 48px rgba(124,58,237,0.12)',
              }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>💌</div>
                <h2 style={{ margin: '0 0 12px', fontSize: '1.3rem', fontWeight: 900, color: '#c4b5fd', letterSpacing: '-0.02em' }}>
                  감정이 비슷한 누군가와<br />한 달간 편지를 나눠요
                </h2>
                <p style={{ margin: '0 0 28px', fontSize: '0.86rem', color: '#7c6fa0', lineHeight: 1.85 }}>
                  서로 이름도, 얼굴도 몰라요.<br />
                  그냥 비슷한 마음을 가진 누군가예요.<br />
                  솔직하게, 천천히, 편지를 써보세요.
                </p>
                <button
                  onClick={() => setView('signup')}
                  style={{
                    padding: '14px 48px', borderRadius: '16px', border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                    color: '#fff', fontSize: '1rem', fontWeight: 800,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
                  }}
                >펜팔 신청하기</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {[
                  { icon: '🎭', title: '완전 익명', desc: '별명만 공개돼요' },
                  { icon: '📬', title: '1:1 매칭', desc: '비슷한 감정의 한 명과' },
                  { icon: '📅', title: '30일간', desc: '느리고 진한 교환' },
                ].map(c => (
                  <div key={c.title} style={{ background: '#0c0c1e', border: '1px solid #1a1830', borderRadius: '16px', padding: '18px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }}>{c.icon}</span>
                    <p style={{ margin: '0 0 4px', fontSize: '0.82rem', fontWeight: 700, color: '#c4b5fd' }}>{c.title}</p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#2d2b50' }}>{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 신청 ── */}
          {view === 'signup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#0c0c1e', border: '1px solid #1a1830', borderRadius: '18px', padding: '20px' }}>
                <p style={{ margin: '0 0 12px', fontSize: '0.72rem', fontWeight: 700, color: '#2d2b50', letterSpacing: '0.06em', textTransform: 'uppercase' }}>나의 별명</p>
                <input
                  value={myAlias}
                  onChange={e => setMyAlias(e.target.value.slice(0, 15))}
                  placeholder="편지에 쓰일 별명 (예: 새벽별)"
                  style={{
                    width: '100%', background: '#08081a', border: '1.5px solid #1a1830',
                    borderRadius: '12px', padding: '11px 14px', color: '#c4b5fd',
                    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit', transition: 'border-color 0.15s',
                  }}
                  onFocus={e  => { e.target.style.borderColor = '#7c3aed44'; }}
                  onBlur={e   => { e.target.style.borderColor = '#1a1830'; }}
                />
                <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: '#2d2b50', textAlign: 'right' }}>{myAlias.length}/15</p>
              </div>

              <div style={{ background: '#0c0c1e', border: '1px solid #1a1830', borderRadius: '18px', padding: '20px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: '#2d2b50', letterSpacing: '0.06em', textTransform: 'uppercase' }}>요즘 자주 느끼는 감정</p>
                <p style={{ margin: '0 0 14px', fontSize: '0.76rem', color: '#1e1c3a' }}>비슷한 감정의 사람과 매칭돼요 · 최대 3개</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {EMOTIONS.map(e => {
                    const sel = myEmotions.includes(e);
                    const color = EMOTION_COLORS[e];
                    return (
                      <button key={e} onClick={() => setMyEmotions(prev => sel ? prev.filter(x => x !== e) : prev.length < 3 ? [...prev, e] : prev)} style={{
                        padding: '7px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: sel ? color + '22' : '#0e0e1f',
                        outline: sel ? `1.5px solid ${color}44` : '1.5px solid transparent',
                        color: sel ? color : '#3d3660',
                        fontSize: '0.82rem', fontWeight: sel ? 700 : 400,
                        transition: 'all 0.15s', fontFamily: 'inherit',
                        opacity: !sel && myEmotions.length >= 3 ? 0.4 : 1,
                      }}>{e}</button>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '14px', padding: '14px 18px' }}>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#7c6fa0', lineHeight: 1.7 }}>
                  🔒 별명 외 어떤 개인정보도 공개되지 않아요.<br />
                  매칭은 보통 24~48시간 내에 이루어져요.
                </p>
              </div>

              <button
                onClick={handleSignup}
                disabled={!myAlias.trim() || myEmotions.length === 0 || submitting}
                style={{
                  padding: '15px', borderRadius: '16px', border: 'none', fontFamily: 'inherit',
                  background: myAlias.trim() && myEmotions.length > 0 ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#0e0e1f',
                  color: myAlias.trim() && myEmotions.length > 0 ? '#fff' : '#2d2b50',
                  fontSize: '0.95rem', fontWeight: 800, cursor: myAlias.trim() && myEmotions.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: myAlias.trim() && myEmotions.length > 0 ? '0 8px 24px rgba(124,58,237,0.35)' : 'none',
                  transition: 'all 0.2s',
                }}
              >{submitting ? '신청 중...' : '💌 펜팔 신청하기'}</button>
            </div>
          )}

          {/* ── 대기 중 ── */}
          {view === 'waiting' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                background: 'rgba(124,58,237,0.12)', border: '2px solid rgba(124,58,237,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
              }}>📬</div>
              <h2 style={{ margin: '0 0 10px', fontSize: '1.1rem', fontWeight: 800, color: '#c4b5fd' }}>매칭을 기다리는 중이에요</h2>
              <p style={{ margin: '0 0 28px', fontSize: '0.86rem', color: '#3d3660', lineHeight: 1.8 }}>
                비슷한 감정을 가진 분이 신청하면<br />바로 알림을 드릴게요. 보통 24~48시간 내에 매칭돼요.
              </p>
              <div style={{ background: '#0c0c1e', border: '1px solid #1a1830', borderRadius: '16px', padding: '20px', display: 'inline-block' }}>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '8px' }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', opacity: 0.3 + i * 0.25, animation: `pulse${i} 1.5s ease-in-out infinite ${i * 0.2}s` }} />
                  ))}
                </div>
                <style dangerouslySetInnerHTML={{ __html: '@keyframes pulse1,pulse2,pulse3{0%,100%{transform:scale(1)}50%{transform:scale(1.4)}}' }} />
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#2d2b50' }}>매칭 대기 중...</p>
              </div>
            </div>
          )}

          {/* ── 매칭됨 ── */}
          {view === 'matched' && match && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 파트너 카드 */}
              <div style={{
                borderRadius: '20px', padding: '22px',
                background: 'linear-gradient(140deg, #1e1245 0%, #0c0c1e 100%)',
                border: '1px solid rgba(124,58,237,0.22)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                    💌
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#2d2b50', marginBottom: '2px' }}>나의 펜팔</p>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#c4b5fd' }}>{match.partner_alias}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span style={{
                        fontSize: '0.72rem', padding: '2px 8px', borderRadius: '8px', fontWeight: 600,
                        background: (EMOTION_COLORS[match.partner_emotion] || '#7c3aed') + '20',
                        color: EMOTION_COLORS[match.partner_emotion] || '#a78bfa',
                        border: `1px solid ${(EMOTION_COLORS[match.partner_emotion] || '#7c3aed')}30`,
                      }}>{match.partner_emotion}</span>
                      <span style={{ fontSize: '0.7rem', color: '#2d2b50' }}>매칭됨 · {timeAgo(match.matched_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 편지 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {match.letters.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: '#0c0c1e', borderRadius: '18px', border: '1px solid #1a1830' }}>
                    <p style={{ margin: '0 0 6px', fontSize: '0.95rem', color: '#2d2b50', fontWeight: 600 }}>아직 편지가 없어요</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e1c3a' }}>첫 번째 편지를 보내보세요</p>
                  </div>
                ) : (
                  match.letters.map(letter => {
                    const isMe = letter.from_alias === '나';
                    return (
                      <div key={letter.id} style={{
                        padding: '18px 20px', borderRadius: '16px',
                        background: isMe ? 'rgba(124,58,237,0.1)' : '#0c0c1e',
                        border: isMe ? '1px solid rgba(124,58,237,0.2)' : '1px solid #1a1830',
                        marginLeft: isMe ? '20px' : '0',
                        marginRight: isMe ? '0' : '20px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: isMe ? '#a78bfa' : '#3d3660' }}>
                            {isMe ? '나' : match.partner_alias}
                          </p>
                          <p suppressHydrationWarning style={{ margin: 0, fontSize: '0.7rem', color: '#1e1c3a' }}>{timeAgo(letter.created_at)}</p>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#7c7a9a', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                          {letter.content}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => setView('write')}
                style={{
                  padding: '14px', borderRadius: '14px', border: 'none', fontFamily: 'inherit',
                  background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                  color: '#fff', fontSize: '0.9rem', fontWeight: 800,
                  cursor: 'pointer', boxShadow: '0 6px 20px rgba(124,58,237,0.3)',
                  transition: 'all 0.2s',
                }}
              >✍️ 편지 쓰기</button>
            </div>
          )}

          {/* ── 편지 쓰기 ── */}
          {view === 'write' && match && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#0c0c1e', border: '1px solid #1a1830', borderRadius: '16px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.1rem' }}>💌</span>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#3d3660' }}>
                  <span style={{ color: '#c4b5fd', fontWeight: 700 }}>{match.partner_alias}</span>에게 편지를 써요
                </p>
              </div>

              <div style={{ position: 'relative' }}>
                <textarea
                  value={letterText}
                  onChange={e => setLetterText(e.target.value.slice(0, 1000))}
                  placeholder={`안녕하세요, ${match.partner_alias}님.\n\n`}
                  rows={14}
                  style={{
                    width: '100%', background: '#0c0c1e', border: '1.5px solid #1a1830',
                    borderRadius: '18px', padding: '20px', color: '#c4b5fd',
                    fontSize: '0.95rem', lineHeight: 1.85, resize: 'none',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e  => { e.target.style.borderColor = '#7c3aed44'; }}
                  onBlur={e   => { e.target.style.borderColor = '#1a1830'; }}
                />
                <p style={{ position: 'absolute', bottom: '14px', right: '18px', margin: 0, fontSize: '0.7rem', color: '#2d2b50' }}>
                  {letterText.length}/1000
                </p>
              </div>

              <button
                onClick={handleSendLetter}
                disabled={!letterText.trim() || sending}
                style={{
                  padding: '15px', borderRadius: '16px', border: 'none', fontFamily: 'inherit',
                  background: letterText.trim() ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#0e0e1f',
                  color: letterText.trim() ? '#fff' : '#2d2b50',
                  fontSize: '0.95rem', fontWeight: 800, cursor: letterText.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: letterText.trim() ? '0 8px 24px rgba(124,58,237,0.35)' : 'none',
                  transition: 'all 0.2s',
                }}
              >{sending ? '전달 중...' : '📬 편지 보내기'}</button>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}