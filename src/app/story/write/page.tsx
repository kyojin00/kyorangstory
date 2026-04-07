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

// 랜덤 익명 이름 프리셋
const NAME_PRESETS = [
  '밤하늘 별', '새벽 안개', '이름 없는 꽃', '조용한 파도',
  '달빛 아래서', '작은 새', '흘러가는 구름', '봄비 한 줄기',
  '멀리서 온 편지', '빈 의자', '늦은 밤 가로등', '젖은 모래',
];

function randomName() {
  return NAME_PRESETS[Math.floor(Math.random() * NAME_PRESETS.length)];
}

export default function StoryWritePage() {
  const [content,       setContent]       = useState('');
  const [selectedTags,  setSelectedTags]  = useState<string[]>([]);
  const [anonymousName, setAnonymousName] = useState(() => randomName());
  const [nameMode,      setNameMode]      = useState<'preset' | 'custom'>('preset');
  const [customName,    setCustomName]    = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [placeholder]   = useState(() =>
    PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]
  );
  const router    = useRouter();
  const remaining = MAX_LENGTH - content.length;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const finalName = nameMode === 'custom' && customName.trim()
    ? customName.trim()
    : anonymousName;

  const handleSubmit = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stories', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          content:        content.trim(),
          emotion_tags:   selectedTags,
          anonymous_name: finalName,
        }),
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
      <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        {/* 헤더 */}
        <div style={{
          borderBottom: '1px solid #1e1b3a', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: '12px',
          position: 'sticky', top: 0, background: '#080810', zIndex: 10,
        }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '1.3rem', padding: 0, lineHeight: 1 }}>
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#a78bfa' }}>
            🌙 익명으로 털어놓기
          </h1>
        </div>

        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 안내 */}
          <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.7, margin: 0 }}>
            여기선 아무도 당신을 판단하지 않아요.<br />
            익명으로 마음을 편하게 털어놓으세요 💜
          </p>

          {/* 익명 이름 설정 */}
          <div style={{ background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '14px', padding: '16px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
              익명 이름
            </p>

            {/* 모드 탭 */}
            <div style={{ display: 'flex', gap: '4px', background: '#080810', borderRadius: '10px', padding: '3px', marginBottom: '12px' }}>
              {([{ key: 'preset', label: '🎲 랜덤' }, { key: 'custom', label: '✏️ 직접 입력' }] as { key: typeof nameMode; label: string }[]).map(m => (
                <button key={m.key} onClick={() => setNameMode(m.key)} style={{
                  flex: 1, padding: '7px', borderRadius: '8px', border: 'none',
                  background: nameMode === m.key ? '#7c3aed' : 'transparent',
                  color: nameMode === m.key ? '#fff' : '#64748b',
                  fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {m.label}
                </button>
              ))}
            </div>

            {nameMode === 'preset' ? (
              <div>
                {/* 현재 이름 표시 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#080810', borderRadius: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#a78bfa', fontWeight: 600 }}>🌙 {anonymousName}</span>
                  <button
                    onClick={() => setAnonymousName(randomName())}
                    style={{ background: 'transparent', border: '1px solid #1e1b3a', borderRadius: '8px', padding: '4px 10px', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1b3a'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                  >
                    🔀 다시 뽑기
                  </button>
                </div>
                {/* 프리셋 목록 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {NAME_PRESETS.map(name => (
                    <button key={name} onClick={() => setAnonymousName(name)} style={{
                      padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                      background: anonymousName === name ? '#7c3aed22' : '#1e1b3a',
                      outline: anonymousName === name ? '1.5px solid #7c3aed' : 'none',
                      color: anonymousName === name ? '#a78bfa' : '#64748b',
                      fontSize: '0.75rem', transition: 'all 0.15s',
                    }}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <input
                  value={customName}
                  onChange={e => setCustomName(e.target.value.slice(0, 20))}
                  placeholder="원하는 익명 이름을 입력해주세요"
                  style={{
                    width: '100%', background: '#080810', border: '1px solid #1e1b3a',
                    borderRadius: '10px', padding: '10px 14px', color: '#e2e8f0',
                    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'sans-serif', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
                  onBlur={e  => { e.target.style.borderColor = '#1e1b3a'; }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#334155', textAlign: 'right' }}>
                  {customName.length}/20
                </p>
                {!customName.trim() && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#475569' }}>
                    비워두면 자동으로 "{anonymousName}" 으로 설정돼요
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 감정 태그 */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
              지금 감정을 선택해주세요 <span style={{ color: '#334155' }}>(선택, 여러 개 가능)</span>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {EMOTIONS.map(e => {
                const selected = selectedTags.includes(e.key);
                return (
                  <button key={e.key} onClick={() => toggleTag(e.key)} style={{
                    padding: '6px 14px', borderRadius: '20px', border: 'none',
                    cursor: 'pointer', fontSize: '0.82rem', fontWeight: selected ? 700 : 400,
                    background: selected ? e.color + '33' : '#0f0f1f',
                    color:      selected ? e.color : '#64748b',
                    outline:    selected ? `1.5px solid ${e.color}` : '1px solid #1e1b3a',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}>
                    <span>{e.icon}</span>{e.key}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 텍스트 영역 */}
          <div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value.slice(0, MAX_LENGTH))}
              placeholder={placeholder}
              rows={10}
              disabled={loading}
              style={{
                width: '100%', background: '#0f0f1f', border: '1px solid #1e1b3a',
                borderRadius: '16px', padding: '16px', color: '#e2e8f0',
                fontSize: '0.95rem', lineHeight: 1.75, resize: 'none',
                outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={e  => { e.target.style.borderColor = '#1e1b3a'; }}
            />
            <p style={{ textAlign: 'right', fontSize: '0.75rem', color: remaining < 100 ? '#f97316' : '#475569', margin: '6px 0 0' }}>
              {remaining.toLocaleString()}자 남음
            </p>
          </div>

          {error && (
            <div style={{ background: '#ef444420', border: '1px solid #ef4444', borderRadius: '12px', padding: '12px 16px', fontSize: '0.875rem', color: '#ef4444' }}>
              {error}
            </div>
          )}

          {/* 미리보기 */}
          <div style={{ background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#475569' }}>게시 후 표시:</span>
            <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 600 }}>🌙 {finalName}</span>
            {selectedTags.slice(0, 2).map(tag => (
              <span key={tag} style={{ fontSize: '0.72rem', padding: '1px 8px', borderRadius: '10px', background: '#7c3aed22', color: '#a78bfa', border: '1px solid #7c3aed33' }}>
                {tag}
              </span>
            ))}
          </div>

          {/* 제출 */}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
            style={{
              width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
              background: content.trim() && !loading ? '#7c3aed' : '#1e1b3a',
              color:      content.trim() && !loading ? '#fff'    : '#475569',
              fontSize: '0.95rem', fontWeight: 700,
              cursor: content.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            {loading ? '게시 중...' : '털어놓기'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#334155', margin: 0 }}>
            🔒 익명으로 게시됩니다. 신원은 절대 노출되지 않아요.
          </p>
        </div>
      </div>
    </SidebarLayout>
  );
}