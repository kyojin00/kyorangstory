'use client';

// src/app/emotion-type/page.tsx

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '@/components/SidebarLayout';

const QUESTIONS = [
  {
    q: '힘든 일이 생겼을 때 나는?',
    options: [
      { text: '혼자 조용히 삭힌다',        scores: { I: 2, E: 0, F: 1, T: 0 } },
      { text: '누군가한테 바로 털어놓는다', scores: { I: 0, E: 2, F: 1, T: 0 } },
      { text: '원인을 분석하고 해결책을 찾는다', scores: { I: 1, E: 0, F: 0, T: 2 } },
      { text: '일단 맛있는 걸 먹는다',      scores: { I: 0, E: 1, F: 2, T: 0 } },
    ],
  },
  {
    q: '감정이 가장 많이 올라오는 시간대는?',
    options: [
      { text: '새벽 — 잠 못 들 때',        scores: { I: 2, E: 0, D: 2, B: 0 } },
      { text: '저녁 — 하루 마무리할 때',   scores: { I: 1, E: 0, D: 1, B: 1 } },
      { text: '낮 — 사람들 속에 있을 때',  scores: { I: 0, E: 2, D: 0, B: 2 } },
      { text: '아침 — 하루 시작할 때',     scores: { I: 0, E: 1, D: 0, B: 1 } },
    ],
  },
  {
    q: '나에게 감정이란?',
    options: [
      { text: '무거운 짐처럼 느껴진다',    scores: { F: 2, T: 0, D: 2, B: 0 } },
      { text: '에너지의 원천이다',         scores: { F: 1, T: 0, D: 0, B: 2 } },
      { text: '이해하고 싶은 신호다',      scores: { F: 0, T: 2, D: 1, B: 0 } },
      { text: '그냥 흘러가는 날씨 같다',  scores: { F: 0, T: 1, D: 0, B: 1 } },
    ],
  },
  {
    q: '친구가 힘들다고 할 때 나는?',
    options: [
      { text: '그냥 옆에서 같이 있어준다', scores: { F: 2, T: 0, I: 1, E: 0 } },
      { text: '해결책을 찾아준다',          scores: { F: 0, T: 2, I: 0, E: 1 } },
      { text: '엄청 공감하며 같이 운다',   scores: { F: 2, T: 0, I: 0, E: 2 } },
      { text: '어떻게 된 건지 자세히 묻는다', scores: { F: 1, T: 1, I: 0, E: 1 } },
    ],
  },
  {
    q: '지금 내 마음 상태를 날씨로 표현하면?',
    options: [
      { text: '흐림 — 뭔가 무겁고 답답해', scores: { D: 2, B: 0, F: 1, T: 0 } },
      { text: '맑음 — 그냥 살만해',        scores: { D: 0, B: 2, F: 0, T: 0 } },
      { text: '안개 — 뭔지 모르겠어',      scores: { D: 1, B: 0, F: 0, T: 1 } },
      { text: '소나기 — 왔다갔다 해',      scores: { D: 1, B: 1, F: 2, T: 0 } },
    ],
  },
  {
    q: '오늘 하루 중 가장 힘든 순간은?',
    options: [
      { text: '아무것도 하기 싫을 때',     scores: { D: 2, B: 0 } },
      { text: '혼자라는 걸 느낄 때',       scores: { I: 2, D: 1 } },
      { text: '내 마음을 몰라줄 때',       scores: { F: 2, E: 1 } },
      { text: '뭘 해도 안 풀릴 때',        scores: { T: 1, D: 1 } },
    ],
  },
  {
    q: '감정을 표현하는 나만의 방식은?',
    options: [
      { text: '일기나 글로 쓴다',          scores: { I: 2, T: 1 } },
      { text: '사람한테 직접 말한다',      scores: { E: 2, F: 1 } },
      { text: '음악이나 영화로 대신한다',  scores: { I: 1, F: 1 } },
      { text: '그냥 시간이 지나길 기다린다', scores: { I: 1, T: 1 } },
    ],
  },
];

type ScoreKey = 'I' | 'E' | 'F' | 'T' | 'D' | 'B';

const RESULTS: Record<string, { title: string; emoji: string; desc: string; color: string; advice: string; match: string }> = {
  '새벽형 감성러': {
    title: '새벽형 감성러', emoji: '🌙',
    color: '#6366f1',
    desc: '감정이 깊고 조용해요. 혼자만의 시간에 가장 솔직해지는 타입이에요. 말 대신 글로 표현하는 걸 좋아하고, 남들이 자는 새벽에 제일 많은 생각을 해요.',
    advice: '감정을 혼자 삭히다 보면 무거워질 수 있어요. 교랑이에게 한 번씩 털어놓아 보세요.',
    match: '따뜻한 공감러',
  },
  '따뜻한 공감러': {
    title: '따뜻한 공감러', emoji: '🌸',
    color: '#ec4899',
    desc: '감정이 풍부하고 공감 능력이 뛰어나요. 다른 사람의 감정을 내 것처럼 느끼는 타입이에요. 그만큼 상처도 잘 받지만, 관계에서 큰 에너지를 얻어요.',
    advice: '남의 감정을 너무 많이 떠안지 않도록 가끔 자신의 감정도 챙겨주세요.',
    match: '차분한 분석러',
  },
  '차분한 분석러': {
    title: '차분한 분석러', emoji: '🔭',
    color: '#06b6d4',
    desc: '감정을 느끼기보다 이해하려는 타입이에요. 왜 이런 감정이 드는지 파악하고 싶어하고, 논리적으로 해결하려고 해요. 겉으론 쿨해 보이지만 속은 세심해요.',
    advice: '분석도 좋지만 가끔은 그냥 감정을 느끼는 것도 OK예요.',
    match: '새벽형 감성러',
  },
  '에너지 충전러': {
    title: '에너지 충전러', emoji: '☀️',
    color: '#f59e0b',
    desc: '감정 기복이 있지만 회복력이 강해요. 힘들어도 금방 털고 일어나는 타입이에요. 사람들 속에서 에너지를 얻고, 감정을 행동으로 표현하는 걸 좋아해요.',
    advice: '빠른 회복 뒤에 해결되지 않은 감정이 남아있을 수 있어요. 한 번쯤 돌아보세요.',
    match: '따뜻한 공감러',
  },
};

function getResult(scores: Record<ScoreKey, number>): string {
  const isIntro  = scores.I >= scores.E;
  const isFeeler = scores.F >= scores.T;
  const isDark   = scores.D >= scores.B;

  if (isIntro && isDark)   return '새벽형 감성러';
  if (!isIntro && isFeeler) return '따뜻한 공감러';
  if (isIntro && !isFeeler) return '차분한 분석러';
  return '에너지 충전러';
}

export default function EmotionTypePage() {
  const [step,      setStep]      = useState<'intro' | 'quiz' | 'result'>('intro');
  const [current,   setCurrent]   = useState(0);
  const [scores,    setScores]    = useState<Record<ScoreKey, number>>({ I:0, E:0, F:0, T:0, D:0, B:0 });
  const [selected,  setSelected]  = useState<number | null>(null);
  const [resultKey, setResultKey] = useState('');
  const [copied,    setCopied]    = useState(false);
  const router = useRouter();

  const handleAnswer = (optionIdx: number) => {
    setSelected(optionIdx);
    setTimeout(() => {
      const opt = QUESTIONS[current].options[optionIdx];
      const next = { ...scores };
      Object.entries(opt.scores).forEach(([k, v]) => { next[k as ScoreKey] = (next[k as ScoreKey] || 0) + v; });
      setScores(next);
      if (current + 1 >= QUESTIONS.length) {
        setResultKey(getResult(next));
        setStep('result');
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 350);
  };

  const result = RESULTS[resultKey];
  const progress = ((current + 1) / QUESTIONS.length) * 100;

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
          <button onClick={() => step === 'quiz' ? setStep('intro') : router.back()}
            style={{ background: '#12112a', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: '7px 12px', borderRadius: '10px', fontFamily: 'inherit' }}>
            ← 뒤로
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em' }}>🧠 감정 유형 테스트</h1>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#2d2b50', marginTop: '1px' }}>나의 감정 패턴을 알아보세요</p>
          </div>
        </div>

        <div style={{ padding: '28px 24px' }}>

          {/* ── 인트로 ── */}
          {step === 'intro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                borderRadius: '24px', padding: '36px 28px', textAlign: 'center',
                background: 'linear-gradient(160deg, #1e1245 0%, #2d1b69 50%, #1a0f3d 100%)',
                border: '1px solid rgba(124,58,237,0.25)',
                boxShadow: '0 16px 48px rgba(124,58,237,0.15)',
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🧠</div>
                <h2 style={{ margin: '0 0 12px', fontSize: '1.4rem', fontWeight: 900, color: '#c4b5fd', letterSpacing: '-0.03em' }}>
                  나는 어떤 감정 유형일까?
                </h2>
                <p style={{ margin: '0 0 28px', fontSize: '0.88rem', color: '#7c6fa0', lineHeight: 1.8 }}>
                  7가지 질문으로 알아보는 나의 감정 패턴.<br />
                  4가지 유형 중 어디에 속하는지 확인해보세요.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
                  {Object.values(RESULTS).map(r => (
                    <div key={r.title} style={{
                      padding: '8px 14px', borderRadius: '12px',
                      background: r.color + '20', border: `1px solid ${r.color}33`,
                      fontSize: '0.82rem', color: r.color, fontWeight: 600,
                    }}>
                      {r.emoji} {r.title}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setStep('quiz')}
                  style={{
                    padding: '14px 48px', borderRadius: '16px', border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                    color: '#fff', fontSize: '1rem', fontWeight: 800,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
                    letterSpacing: '-0.01em',
                  }}
                >테스트 시작하기</button>
              </div>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#2d2b50' }}>총 7문항 · 약 2분 소요</p>
            </div>
          )}

          {/* ── 퀴즈 ── */}
          {step === 'quiz' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 진행바 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#2d2b50' }}>질문 {current + 1} / {QUESTIONS.length}</span>
                  <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700 }}>{Math.round(progress)}%</span>
                </div>
                <div style={{ height: '4px', background: '#12112a', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                </div>
              </div>

              {/* 질문 */}
              <div style={{ background: '#0c0c1e', border: '1px solid #1a1830', borderRadius: '20px', padding: '28px 24px' }}>
                <p style={{ margin: '0 0 24px', fontSize: '1.05rem', fontWeight: 800, color: '#c4b5fd', lineHeight: 1.5, letterSpacing: '-0.02em' }}>
                  {QUESTIONS[current].q}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {QUESTIONS[current].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={selected !== null}
                      style={{
                        padding: '14px 18px', borderRadius: '14px', border: 'none',
                        background: selected === i ? 'rgba(124,58,237,0.25)' : '#0e0e1f',
                        outline: selected === i ? '1.5px solid #7c3aed' : '1.5px solid #1a1830',
                        color: selected === i ? '#c4b5fd' : '#4a5568',
                        fontSize: '0.9rem', fontWeight: selected === i ? 700 : 400,
                        cursor: selected !== null ? 'default' : 'pointer',
                        textAlign: 'left', transition: 'all 0.2s',
                        fontFamily: 'inherit', lineHeight: 1.5,
                      }}
                    >{opt.text}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 결과 ── */}
          {step === 'result' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* 결과 카드 */}
              <div style={{
                borderRadius: '24px', padding: '36px 28px', textAlign: 'center',
                background: `linear-gradient(160deg, ${result.color}22 0%, #0c0c1e 100%)`,
                border: `1px solid ${result.color}33`,
                boxShadow: `0 16px 48px ${result.color}18`,
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>{result.emoji}</div>
                <p style={{ margin: '0 0 6px', fontSize: '0.8rem', fontWeight: 700, color: result.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>나의 감정 유형</p>
                <h2 style={{ margin: '0 0 16px', fontSize: '1.6rem', fontWeight: 900, color: '#e2e8f0', letterSpacing: '-0.03em' }}>
                  {result.title}
                </h2>
                <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#7c7a9a', lineHeight: 1.85, maxWidth: '400px', marginInline: 'auto' }}>
                  {result.desc}
                </p>
                <div style={{ background: `${result.color}15`, border: `1px solid ${result.color}25`, borderRadius: '14px', padding: '14px 18px', marginBottom: '24px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '0.72rem', fontWeight: 700, color: result.color, letterSpacing: '0.04em' }}>💡 교랑이의 조언</p>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.7 }}>{result.advice}</p>
                </div>
                <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: '#2d2b50' }}>
                  나와 잘 맞는 유형 → <span style={{ color: result.color, fontWeight: 700 }}>{result.match}</span>
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`나의 교랑 감정 유형은 "${result.title}" ${result.emoji}\nstory.kyorang.com/emotion-type`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    style={{
                      padding: '11px 24px', borderRadius: '12px', border: 'none',
                      background: copied ? '#22c55e' : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                      color: '#fff', fontSize: '0.85rem', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                      transition: 'all 0.2s',
                    }}
                  >{copied ? '✓ 복사됨!' : '🔗 결과 공유하기'}</button>
                  <button
                    onClick={() => { setStep('intro'); setCurrent(0); setScores({ I:0,E:0,F:0,T:0,D:0,B:0 }); setSelected(null); }}
                    style={{ padding: '11px 24px', borderRadius: '12px', border: '1px solid #1a1830', background: 'transparent', color: '#3d3660', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                  >🔄 다시 하기</button>
                </div>
              </div>

              {/* 다른 유형들 */}
              <div style={{ background: '#0c0c1e', border: '1px solid #1a1830', borderRadius: '18px', padding: '20px' }}>
                <p style={{ margin: '0 0 14px', fontSize: '0.72rem', fontWeight: 700, color: '#2d2b50', letterSpacing: '0.06em', textTransform: 'uppercase' }}>다른 감정 유형</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.values(RESULTS).filter(r => r.title !== result.title).map(r => (
                    <div key={r.title} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#0e0e1f', borderRadius: '12px', border: '1px solid #12112a' }}>
                      <span style={{ fontSize: '1.4rem' }}>{r.emoji}</span>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: r.color }}>{r.title}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#2d2b50', marginTop: '2px' }}>{r.desc.slice(0, 30)}...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}