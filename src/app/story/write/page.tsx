'use client';

// src/app/story/write/page.tsx

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '@/components/SidebarLayout';

const MAX_LENGTH = 1000;

const PLACEHOLDERS = [
  '오늘 하루가 너무 무거웠어요...',
  '아무한테도 말 못 한 이야기가 있어요.',
  '그냥 누군가가 들어줬으면 해서요.',
  '요즘 이유 없이 눈물이 나요.',
  '혼자인 게 너무 싫은 날이에요.',
];

const EMOTIONS = [
  { key: '우울',    icon: '😔', color: '#6366f1' },
  { key: '불안',    icon: '😰', color: '#f59e0b' },
  { key: '외로움',  icon: '🥺', color: '#8b5cf6' },
  { key: '분노',    icon: '😤', color: '#ef4444' },
  { key: '기쁨',    icon: '😊', color: '#22c55e' },
  { key: '설렘',    icon: '🥰', color: '#ec4899' },
  { key: '스트레스', icon: '😩', color: '#f97316' },
  { key: '허무함',  icon: '😶', color: '#64748b' },
  { key: '평온',    icon: '😌', color: '#06b6d4' },
  { key: '감사',    icon: '🙏', color: '#f59e0b' },
];

const NAME_PRESETS = [
  '밤하늘 별', '새벽 안개', '이름 없는 꽃', '조용한 파도',
  '달빛 아래서', '작은 새', '흘러가는 구름', '봄비 한 줄기',
  '멀리서 온 편지', '빈 의자', '늦은 밤 가로등', '젖은 모래',
];

function randomName() {
  return NAME_PRESETS[Math.floor(Math.random() * NAME_PRESETS.length)];
}

/* ── 섹션 래퍼 ── */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#0c0c1e', border: '1px solid #1a1830',
      borderRadius: '18px', padding: '20px',
    }}>
      {children}
    </div>
  );
}

/* ── 섹션 레이블 ── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 12px', fontSize: '0.72rem', fontWeight: 700, color: '#2d2b50', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      {children}
    </p>
  );
}

/* ── 감정 태그 버튼 ── */
function EmotionBtn({ emotion, selected, onClick }: { emotion: typeof EMOTIONS[0]; selected: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '7px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
        fontSize: '0.82rem', fontWeight: selected ? 700 : 400,
        background: selected ? emotion.color + '22' : hov ? '#12112a' : '#0e0e1f',
        color: selected ? emotion.color : hov ? '#7c6fa0' : '#3d3660',
        outline: selected ? `1.5px solid ${emotion.color}55` : '1.5px solid transparent',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: '5px',
        fontFamily: 'inherit',
      }}
    >
      <span>{emotion.icon}</span>{emotion.key}
    </button>
  );
}

export default function StoryWritePage() {
  const [content,       setContent]       = useState('');
  const [selectedTags,  setSelectedTags]  = useState<string[]>([]);
  const [anonymousName, setAnonymousName] = useState(() => randomName());
  const [nameMode,      setNameMode]      = useState<'preset' | 'custom'>('preset');
  const [customName,    setCustomName]    = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [placeholder]   = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  const router    = useRouter();
  const remaining = MAX_LENGTH - content.length;

  const toggleTag = (tag: string) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const finalName = nameMode === 'custom' && customName.trim() ? customName.trim() : anonymousName;
  const canSubmit = content.trim().length > 0 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/stories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), emotion_tags: selectedTags, anonymous_name: finalName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '오류가 발생했어요');
      router.push(`/story/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요');
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>

        {/* ── 헤더 ── */}
        <div style={{
          padding: '14px 24px', position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(6,6,16,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #0f0f22',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: '#12112a', border: 'none', color: '#a78bfa',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              padding: '7px 12px', borderRadius: '10px', lineHeight: 1,
              transition: 'background 0.15s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#12112a'; }}
          >← 뒤로</button>
          <div>
            <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em' }}>
              🌙 익명으로 털어놓기
            </h1>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#2d2b50', marginTop: '1px' }}>완전 익명 · 판단 없는 공간</p>
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── 안내 배너 ── */}
          <div style={{
            borderRadius: '16px', padding: '16px 20px',
            background: 'linear-gradient(140deg, #1e1245 0%, #12112a 100%)',
            border: '1px solid rgba(124,58,237,0.18)',
            display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>💜</span>
            <p style={{ margin: 0, fontSize: '0.83rem', color: '#7c6fa0', lineHeight: 1.75 }}>
              여기선 아무도 당신을 판단하지 않아요.<br />
              익명으로 마음을 편하게 털어놓으세요.
            </p>
          </div>

          {/* ── 익명 이름 ── */}
          <Section>
            <Label>익명 이름</Label>

            {/* 모드 탭 */}
            <div style={{ display: 'flex', gap: '4px', background: '#08081a', borderRadius: '12px', padding: '4px', marginBottom: '14px' }}>
              {([{ key: 'preset', label: '🎲 랜덤' }, { key: 'custom', label: '✏️ 직접 입력' }] as { key: typeof nameMode; label: string }[]).map(m => (
                <button
                  key={m.key}
                  onClick={() => setNameMode(m.key)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '9px', border: 'none',
                    background: nameMode === m.key ? '#7c3aed' : 'transparent',
                    color: nameMode === m.key ? '#fff' : '#3d3660',
                    fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                    boxShadow: nameMode === m.key ? '0 2px 8px rgba(124,58,237,0.3)' : 'none',
                  }}
                >{m.label}</button>
              ))}
            </div>

            {nameMode === 'preset' ? (
              <>
                {/* 현재 선택 이름 */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px', background: '#08081a', borderRadius: '12px',
                  marginBottom: '12px', border: '1px solid #12112a',
                }}>
                  <span style={{ fontSize: '0.9rem', color: '#c4b5fd', fontWeight: 700 }}>🌙 {anonymousName}</span>
                  <button
                    onClick={() => setAnonymousName(randomName())}
                    style={{
                      background: 'transparent', border: '1px solid #1a1830',
                      borderRadius: '8px', padding: '5px 11px', color: '#3d3660',
                      fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#7c3aed44'; el.style.color = '#a78bfa'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1a1830'; el.style.color = '#3d3660'; }}
                  >🔀 다시 뽑기</button>
                </div>

                {/* 프리셋 목록 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {NAME_PRESETS.map(name => {
                    const sel = anonymousName === name;
                    return (
                      <button
                        key={name}
                        onClick={() => setAnonymousName(name)}
                        style={{
                          padding: '5px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                          background: sel ? 'rgba(124,58,237,0.18)' : '#0e0e1f',
                          outline: sel ? '1.5px solid #7c3aed55' : '1.5px solid transparent',
                          color: sel ? '#a78bfa' : '#3d3660',
                          fontSize: '0.76rem', transition: 'all 0.15s', fontFamily: 'inherit',
                        }}
                      >{name}</button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <input
                  value={customName}
                  onChange={e => setCustomName(e.target.value.slice(0, 20))}
                  placeholder="원하는 익명 이름을 입력해주세요"
                  style={{
                    width: '100%', background: '#08081a', border: '1.5px solid #1a1830',
                    borderRadius: '12px', padding: '11px 14px', color: '#c4b5fd',
                    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit', transition: 'border-color 0.15s',
                  }}
                  onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
                  onBlur={e   => { e.target.style.borderColor = '#1a1830'; }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  {!customName.trim()
                    ? <p style={{ margin: 0, fontSize: '0.73rem', color: '#2d2b50' }}>비워두면 "{anonymousName}" 으로 설정돼요</p>
                    : <span />
                  }
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#2d2b50' }}>{customName.length}/20</p>
                </div>
              </>
            )}
          </Section>

          {/* ── 감정 태그 ── */}
          <Section>
            <Label>감정 태그 <span style={{ fontSize: '0.65rem', color: '#1e1c3a', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>선택 · 여러 개 가능</span></Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {EMOTIONS.map(e => (
                <EmotionBtn
                  key={e.key} emotion={e}
                  selected={selectedTags.includes(e.key)}
                  onClick={() => toggleTag(e.key)}
                />
              ))}
            </div>
          </Section>

          {/* ── 내용 입력 ── */}
          <div style={{ position: 'relative' }}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value.slice(0, MAX_LENGTH))}
              placeholder={placeholder}
              rows={10}
              disabled={loading}
              style={{
                width: '100%', background: '#0c0c1e',
                border: '1.5px solid #1a1830', borderRadius: '18px',
                padding: '18px 20px', color: '#c4b5fd',
                fontSize: '0.95rem', lineHeight: 1.8, resize: 'none',
                outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={e  => { e.target.style.borderColor = '#7c3aed55'; }}
              onBlur={e   => { e.target.style.borderColor = '#1a1830'; }}
            />
            <p style={{
              position: 'absolute', bottom: '14px', right: '18px',
              margin: 0, fontSize: '0.72rem',
              color: remaining < 100 ? '#f97316' : '#2d2b50',
              pointerEvents: 'none',
            }}>{remaining.toLocaleString()}자 남음</p>
          </div>

          {/* ── 에러 ── */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 16px' }}>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#f87171' }}>{error}</p>
            </div>
          )}

          {/* ── 미리보기 ── */}
          <div style={{
            background: '#0c0c1e', border: '1px solid #1a1830',
            borderRadius: '14px', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.73rem', color: '#2d2b50' }}>게시 후 표시:</span>
            <span style={{ fontSize: '0.85rem', color: '#c4b5fd', fontWeight: 700 }}>🌙 {finalName}</span>
            {selectedTags.slice(0, 3).map(tag => {
              const em = EMOTIONS.find(e => e.key === tag);
              return (
                <span key={tag} style={{
                  fontSize: '0.72rem', padding: '2px 9px', borderRadius: '8px', fontWeight: 600,
                  background: em ? em.color + '18' : 'rgba(124,58,237,0.12)',
                  color: em ? em.color : '#a78bfa',
                  border: `1px solid ${em ? em.color + '28' : 'rgba(124,58,237,0.2)'}`,
                }}>{tag}</span>
              );
            })}
          </div>

          {/* ── 제출 ── */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '15px', borderRadius: '16px', border: 'none', fontFamily: 'inherit',
              background: canSubmit ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#0e0e1f',
              color: canSubmit ? '#fff' : '#2d2b50',
              fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.01em',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              boxShadow: canSubmit ? '0 8px 24px rgba(124,58,237,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (canSubmit) { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = '0 12px 32px rgba(124,58,237,0.45)'; } }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = canSubmit ? '0 8px 24px rgba(124,58,237,0.35)' : 'none'; }}
          >
            {loading ? '게시 중...' : '🌙 털어놓기'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.73rem', color: '#1e1c3a', margin: 0 }}>
            🔒 완전 익명으로 게시돼요. 신원은 절대 노출되지 않아요.
          </p>
        </div>
      </div>
    </SidebarLayout>
  );
}