'use client';

// src/app/diary/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

type EmotionKey =
  | '우울' | '불안' | '외로움' | '분노' | '기쁨'
  | '설렘' | '스트레스' | '허무함' | '평온' | '감사';

const EMOTIONS: { key: EmotionKey; icon: string; color: string }[] = [
  { key: '기쁨',    icon: '😊', color: '#22c55e' },
  { key: '설렘',    icon: '🥰', color: '#ec4899' },
  { key: '감사',    icon: '🙏', color: '#f59e0b' },
  { key: '평온',    icon: '😌', color: '#06b6d4' },
  { key: '우울',    icon: '😔', color: '#6366f1' },
  { key: '불안',    icon: '😰', color: '#f59e0b' },
  { key: '외로움',  icon: '🥺', color: '#8b5cf6' },
  { key: '분노',    icon: '😤', color: '#ef4444' },
  { key: '스트레스', icon: '😩', color: '#f97316' },
  { key: '허무함',  icon: '😶', color: '#64748b' },
];

const EMOTION_MAP = Object.fromEntries(EMOTIONS.map(e => [e.key, e]));

interface DiaryEntry {
  id:      string;
  date:    string;
  emotion: EmotionKey;
  note:    string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay(); // 0=일, 1=월
}

export default function DiaryPage() {
  const today    = new Date();
  const [year,   setYear]   = useState(today.getFullYear());
  const [month,  setMonth]  = useState(today.getMonth() + 1);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(
    today.toISOString().split('T')[0]
  );

  // 모달 상태
  const [modalEmotion, setModalEmotion] = useState<EmotionKey | null>(null);
  const [modalNote,    setModalNote]    = useState('');
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);

  const router   = useRouter();
  const supabase = createClient();

  const fetchEntries = async (y: number, m: number) => {
    setLoading(true);
    const res  = await fetch(`/api/diary?year=${y}&month=${m}`);
    const data = await res.json();
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/'); return; }
    });
    fetchEntries(year, month);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const entryMap = Object.fromEntries(entries.map(e => [e.date, e]));
  const selectedEntry = selected ? entryMap[selected] : null;

  const handleDayClick = (dateStr: string) => {
    setSelected(dateStr);
    const entry = entryMap[dateStr];
    setModalEmotion(entry?.emotion ?? null);
    setModalNote(entry?.note ?? '');
  };

  const handleSave = async () => {
    if (!modalEmotion || !selected || saving) return;
    setSaving(true);
    await fetch('/api/diary', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emotion: modalEmotion, note: modalNote, date: selected }),
    });
    await fetchEntries(year, month);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selected || !selectedEntry) return;
    if (!confirm('이 날의 기록을 삭제할까요?')) return;
    await fetch(`/api/diary?date=${selected}`, { method: 'DELETE' });
    setModalEmotion(null);
    setModalNote('');
    await fetchEntries(year, month);
  };

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const daysInMonth  = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfMonth(year, month); // 0=일
  const weeks = ['일', '월', '화', '수', '목', '금', '토'];

  // 이번달 감정 통계
  const stats = EMOTIONS.map(e => ({
    ...e,
    count: entries.filter(d => d.emotion === e.key).length,
  })).filter(e => e.count > 0).sort((a, b) => b.count - a.count);

  const todayStr = today.toISOString().split('T')[0];
  const isFuture = (dateStr: string) => dateStr > todayStr;

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px 60px', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        {/* 헤더 */}
        <div style={{
          borderBottom: '1px solid #1e1b3a', padding: '18px 0',
          position: 'sticky', top: 0, background: '#080810', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#e2e8f0' }}>
            📔 감정 다이어리
          </h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            매일 나의 감정을 기록해보세요
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', marginTop: '24px' }}>

          {/* ── 왼쪽: 캘린더 ── */}
          <div>
            {/* 월 네비게이션 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <button onClick={prevMonth} style={{ background: '#1e1b3a', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}>
                ←
              </button>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0' }}>
                {year}년 {month}월
              </h2>
              <button
                onClick={nextMonth}
                disabled={year === today.getFullYear() && month === today.getMonth() + 1}
                style={{
                  background: '#1e1b3a', border: 'none', borderRadius: '8px',
                  padding: '6px 12px', cursor: 'pointer', fontSize: '1rem',
                  color: (year === today.getFullYear() && month === today.getMonth() + 1) ? '#334155' : '#94a3b8',
                }}
              >
                →
              </button>
            </div>

            {/* 요일 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
              {weeks.map((w, i) => (
                <div key={w} style={{
                  textAlign: 'center', fontSize: '0.78rem', fontWeight: 700,
                  color: i === 0 ? '#ef4444' : i === 6 ? '#6366f1' : '#64748b',
                  padding: '6px 0',
                }}>
                  {w}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {/* 빈 칸 (첫 날 이전) */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* 날짜 */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day     = i + 1;
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const entry   = entryMap[dateStr];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selected;
                const future  = isFuture(dateStr);
                const dayOfWeek = (firstDayOfWeek + i) % 7;

                return (
                  <button
                    key={day}
                    onClick={() => !future && handleDayClick(dateStr)}
                    disabled={future}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #7c3aed' : isToday ? '2px solid #7c3aed44' : '2px solid transparent',
                      background: entry
                        ? EMOTION_MAP[entry.emotion]?.color + '22'
                        : isSelected ? '#1e1b3a' : 'transparent',
                      cursor: future ? 'not-allowed' : 'pointer',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: '2px', padding: '4px',
                      transition: 'all 0.15s',
                      opacity: future ? 0.3 : 1,
                    }}
                    onMouseEnter={e => { if (!future) (e.currentTarget as HTMLElement).style.background = entry ? EMOTION_MAP[entry.emotion]?.color + '33' : '#1e1b3a'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = entry ? EMOTION_MAP[entry.emotion]?.color + '22' : isSelected ? '#1e1b3a' : 'transparent'; }}
                  >
                    <span style={{
                      fontSize: '0.78rem', fontWeight: isToday ? 800 : 500,
                      color: isToday ? '#a78bfa' : dayOfWeek === 0 ? '#ef4444' : dayOfWeek === 6 ? '#6366f1' : '#94a3b8',
                    }}>
                      {day}
                    </span>
                    {entry && (
                      <span style={{ fontSize: '1rem', lineHeight: 1 }}>
                        {EMOTION_MAP[entry.emotion]?.icon}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 오른쪽: 입력 + 통계 ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 선택된 날짜 카드 */}
            <div style={{
              background: '#0f0f1f', border: '1px solid #1e1b3a',
              borderRadius: '16px', padding: '18px',
            }}>
              <p style={{ margin: '0 0 14px', fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>
                {selected
                  ? `${selected.replace(/-/g, '.')} ${selected === todayStr ? '(오늘)' : ''}`
                  : '날짜를 선택해주세요'}
              </p>

              {/* 감정 선택 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '14px' }}>
                {EMOTIONS.map(e => (
                  <button
                    key={e.key}
                    onClick={() => setModalEmotion(prev => prev === e.key ? null : e.key)}
                    disabled={!selected || isFuture(selected)}
                    title={e.key}
                    style={{
                      aspectRatio: '1', borderRadius: '10px', border: 'none',
                      background: modalEmotion === e.key ? e.color + '44' : '#1e1b3a',
                      outline: modalEmotion === e.key ? `2px solid ${e.color}` : 'none',
                      cursor: 'pointer', fontSize: '1.3rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                      transform: modalEmotion === e.key ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {e.icon}
                  </button>
                ))}
              </div>

              {/* 감정명 표시 */}
              {modalEmotion && (
                <p style={{ margin: '0 0 10px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: EMOTION_MAP[modalEmotion]?.color }}>
                  {EMOTION_MAP[modalEmotion]?.icon} {modalEmotion}
                </p>
              )}

              {/* 메모 */}
              <textarea
                value={modalNote}
                onChange={e => setModalNote(e.target.value)}
                placeholder="오늘 어떤 하루였나요? (선택)"
                rows={3}
                disabled={!selected || isFuture(selected ?? '')}
                maxLength={200}
                style={{
                  width: '100%', background: '#080810',
                  border: '1px solid #1e1b3a', borderRadius: '10px',
                  padding: '10px 12px', color: '#e2e8f0',
                  fontSize: '0.875rem', outline: 'none', resize: 'none',
                  boxSizing: 'border-box', fontFamily: 'sans-serif',
                  lineHeight: 1.6, transition: 'border-color 0.15s',
                  marginBottom: '10px',
                }}
                onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
                onBlur={e   => { e.target.style.borderColor = '#1e1b3a'; }}
              />
              <p style={{ textAlign: 'right', fontSize: '0.7rem', color: '#334155', margin: '-6px 0 10px' }}>
                {modalNote.length}/200
              </p>

              {/* 저장/삭제 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSave}
                  disabled={!modalEmotion || saving || !selected || isFuture(selected ?? '')}
                  style={{
                    flex: 1, padding: '10px',
                    background: modalEmotion && !saving ? '#7c3aed' : '#1e1b3a',
                    border: 'none', borderRadius: '10px',
                    color: modalEmotion && !saving ? '#fff' : '#475569',
                    fontSize: '0.875rem', fontWeight: 700,
                    cursor: modalEmotion && !saving ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s',
                  }}
                >
                  {saving ? '저장 중...' : selectedEntry ? '수정하기' : '기록하기'}
                </button>
                {selectedEntry && (
                  <button
                    onClick={handleDelete}
                    style={{
                      padding: '10px 14px', background: 'transparent',
                      border: '1px solid #334155', borderRadius: '10px',
                      color: '#ef4444', fontSize: '0.875rem', cursor: 'pointer',
                    }}
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>

            {/* 이번달 감정 통계 */}
            {stats.length > 0 && (
              <div style={{
                background: '#0f0f1f', border: '1px solid #1e1b3a',
                borderRadius: '16px', padding: '18px',
              }}>
                <p style={{ margin: '0 0 14px', fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                  {month}월 감정 통계
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stats.slice(0, 5).map(e => (
                    <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{e.icon}</span>
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8', width: '52px', flexShrink: 0 }}>{e.key}</span>
                      <div style={{ flex: 1, background: '#1e1b3a', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '4px',
                          background: e.color,
                          width: `${(e.count / entries.length) * 100}%`,
                          transition: 'width 0.4s',
                        }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', flexShrink: 0 }}>{e.count}일</span>
                    </div>
                  ))}
                </div>
                <p style={{ margin: '12px 0 0', fontSize: '0.75rem', color: '#334155', textAlign: 'center' }}>
                  총 {entries.length}일 기록
                </p>
              </div>
            )}

            {/* 연속 기록 */}
            {entries.length > 0 && (() => {
              let streak = 0;
              const d = new Date();
              while (true) {
                const s = d.toISOString().split('T')[0];
                if (!entryMap[s]) break;
                streak++;
                d.setDate(d.getDate() - 1);
              }
              return streak > 0 ? (
                <div style={{
                  background: 'linear-gradient(135deg, #1a0a2e, #0f0820)',
                  border: '1px solid #4c1d9555',
                  borderRadius: '16px', padding: '16px', textAlign: 'center',
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: '1.8rem', fontWeight: 900, color: '#a78bfa' }}>
                    🔥 {streak}일
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>연속 기록 중</p>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}