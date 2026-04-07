'use client';

// src/app/onboarding/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Step = 'profile' | 'interests' | 'follow' | 'done';

const INTEREST_LIST = [
  { key: '일상',    icon: '☀️' },
  { key: '연애',    icon: '💕' },
  { key: '직장',    icon: '💼' },
  { key: '학업',    icon: '📚' },
  { key: '가족',    icon: '👨‍👩‍👧' },
  { key: '건강',    icon: '🏃' },
  { key: '취미',    icon: '🎨' },
  { key: '여행',    icon: '✈️' },
  { key: '음악',    icon: '🎵' },
  { key: '게임',    icon: '🎮' },
  { key: '영화',    icon: '🎬' },
  { key: '독서',    icon: '📖' },
];

const STEPS: Step[] = ['profile', 'interests', 'follow', 'done'];
const STEP_LABELS   = ['프로필', '관심사', '팔로우', '완료'];

interface SuggestedUser {
  id:              string;
  username:        string;
  display_name:    string;
  avatar_url:      string;
  followers_count: number;
  is_following:    boolean;
}

export default function OnboardingPage() {
  const [step,         setStep]         = useState<Step>('profile');
  const [username,     setUsername]     = useState('');
  const [displayName,  setDisplayName]  = useState('');
  const [bio,          setBio]          = useState('');
  const [usernameOk,   setUsernameOk]   = useState<boolean | null>(null);
  const [checking,     setChecking]     = useState(false);
  const [interests,    setInterests]    = useState<string[]>([]);
  const [suggestions,  setSuggestions]  = useState<SuggestedUser[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const router   = useRouter();
  const supabase = createClient();

  // 초기 이름 자동 채우기
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/'); return; }
      const name = (data.user.user_metadata?.full_name as string)
                || (data.user.user_metadata?.name as string)
                || '';
      if (name) setDisplayName(name);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // username 중복 확인
  useEffect(() => {
    if (!/^[a-z0-9_.]{3,20}$/.test(username)) { setUsernameOk(null); return; }
    const t = setTimeout(async () => {
      setChecking(true);
      const res  = await fetch(`/api/profile/check?username=${username}`);
      const data = await res.json();
      setUsernameOk(data.available);
      setChecking(false);
    }, 500);
    return () => clearTimeout(t);
  }, [username]);

  // 추천 유저 로드 (follow 단계)
  useEffect(() => {
    if (step !== 'follow') return;
    supabase.from('profiles')
      .select('id, username, display_name, avatar_url, followers_count')
      .order('followers_count', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setSuggestions((data ?? []).map(u => ({ ...u, is_following: false })));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Step 1: 프로필 저장
  const handleProfileSave = async () => {
    if (!usernameOk || !displayName.trim() || saving) return;
    setSaving(true); setError('');
    const res  = await fetch('/api/profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, display_name: displayName, bio }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? '오류가 발생했어요'); setSaving(false); return; }
    setSaving(false);
    setStep('interests');
  };

  // Step 3: 팔로우 토글
  const handleFollow = async (targetUsername: string) => {
    await fetch(`/api/profile/${targetUsername}/follow`, { method: 'POST' });
    setSuggestions(prev => prev.map(u =>
      u.username === targetUsername ? { ...u, is_following: !u.is_following } : u
    ));
  };

  // Step 4: 완료
  const handleDone = () => router.replace('/feed');

  const stepIndex = STEPS.indexOf(step);
  const progress  = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div style={{
      minHeight: '100vh', background: '#080810', color: '#e2e8f0',
      fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '2rem' }}>🌙</span>
          <h1 style={{ margin: '8px 0 0', fontSize: '1.4rem', fontWeight: 900, color: '#a78bfa' }}>교랑 스토리</h1>
        </div>

        {/* 진행 바 */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            {STEP_LABELS.map((label, i) => (
              <span key={label} style={{
                fontSize: '0.75rem', fontWeight: i === stepIndex ? 700 : 400,
                color: i <= stepIndex ? '#a78bfa' : '#334155',
              }}>
                {label}
              </span>
            ))}
          </div>
          <div style={{ background: '#1e1b3a', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
            <div style={{ background: '#7c3aed', height: '100%', width: `${progress}%`, transition: 'width 0.4s', borderRadius: '4px' }} />
          </div>
        </div>

        {/* ─── Step 1: 프로필 ─── */}
        {step === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 800 }}>프로필을 만들어요</h2>
            <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: '#64748b' }}>
              비익명 모드에서 사용할 프로필이에요. 나중에 수정할 수 있어요.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  아이디 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: '0.9rem' }}>@</span>
                  <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                    placeholder="kyorang_user" maxLength={20}
                    style={{ ...inputStyle, paddingLeft: '28px' }}
                    onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
                    onBlur={e  => { e.target.style.borderColor = '#1e1b3a'; }}
                  />
                </div>
                {username && (
                  <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: checking ? '#94a3b8' : usernameOk ? '#22c55e' : '#ef4444' }}>
                    {checking ? '확인 중...' : usernameOk ? '✓ 사용 가능' : usernameOk === false ? '이미 사용 중' : '영문 소문자, 숫자, ._  (3~20자)'}
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  표시 이름 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="교랑이" maxLength={30}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
                  onBlur={e  => { e.target.style.borderColor = '#1e1b3a'; }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  소개 <span style={{ color: '#475569' }}>(선택)</span>
                </label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="간단한 자기소개" rows={3} maxLength={150}
                  style={{ ...inputStyle, resize: 'none' }}
                  onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
                  onBlur={e  => { e.target.style.borderColor = '#1e1b3a'; }}
                />
              </div>
            </div>

            {error && <p style={{ fontSize: '0.82rem', color: '#ef4444', marginTop: '12px' }}>{error}</p>}

            <button
              onClick={handleProfileSave}
              disabled={!usernameOk || !displayName.trim() || saving}
              style={btnStyle(!usernameOk || !displayName.trim() || saving)}
            >
              {saving ? '저장 중...' : '다음 →'}
            </button>
          </div>
        )}

        {/* ─── Step 2: 관심사 ─── */}
        {step === 'interests' && (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 800 }}>관심사를 골라요</h2>
            <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: '#64748b' }}>
              관심 있는 주제를 선택해요. 비슷한 글을 추천해드릴게요. (1개 이상)
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
              {INTEREST_LIST.map(item => {
                const selected = interests.includes(item.key);
                return (
                  <button
                    key={item.key}
                    onClick={() => setInterests(prev =>
                      prev.includes(item.key) ? prev.filter(i => i !== item.key) : [...prev, item.key]
                    )}
                    style={{
                      padding: '12px 8px', borderRadius: '12px', cursor: 'pointer',
                      background: selected ? '#7c3aed22' : '#0f0f1f',
                      outline: selected ? '2px solid #7c3aed' : '1px solid #1e1b3a',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      transition: 'all 0.15s',
                      transform: selected ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                    <span style={{ fontSize: '0.75rem', color: selected ? '#a78bfa' : '#94a3b8', fontWeight: selected ? 700 : 400 }}>
                      {item.key}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setStep('profile')} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '0.9rem', cursor: 'pointer' }}>
                ← 이전
              </button>
              <button
                onClick={() => setStep('follow')}
                disabled={interests.length === 0}
                style={{ ...btnStyle(interests.length === 0), flex: 2 }}
              >
                다음 →
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 3: 팔로우 ─── */}
        {step === 'follow' && (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 800 }}>사람들을 팔로우해요</h2>
            <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: '#64748b' }}>
              팔로우하면 피드에서 그 사람의 글을 볼 수 있어요.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', maxHeight: '360px', overflowY: 'auto' }}>
              {suggestions.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '12px' }}>
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt={u.display_name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {u.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>@{u.username} · 팔로워 {u.followers_count}</p>
                  </div>
                  <button
                    onClick={() => handleFollow(u.username)}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', cursor: 'pointer',
                      background: u.is_following ? 'transparent' : '#7c3aed',
                      border: u.is_following ? '1px solid #334155' : 'none',
                      color: u.is_following ? '#94a3b8' : '#fff',
                      fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, transition: 'all 0.15s',
                    } as React.CSSProperties}
                  >
                    {u.is_following ? '팔로잉' : '팔로우'}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setStep('interests')} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '0.9rem', cursor: 'pointer' }}>
                ← 이전
              </button>
              <button onClick={() => setStep('done')} style={{ ...btnStyle(false), flex: 2 }}>
                다음 →
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 4: 완료 ─── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 800, color: '#a78bfa' }}>
              환영해요!
            </h2>
            <p style={{ margin: '0 0 32px', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.7 }}>
              교랑 스토리 준비가 됐어요.<br />
              익명으로 털어놓거나, 피드에서 사람들과 소통해보세요 💜
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleDone}
                style={btnStyle(false)}
              >
                🏠 피드로 이동
              </button>
              <button
                onClick={() => router.replace('/story/write')}
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px',
                  border: '1px solid #7c3aed44', background: '#7c3aed22',
                  color: '#a78bfa', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                🌙 익명으로 털어놓기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0f0f1f', border: '1px solid #1e1b3a',
  borderRadius: '12px', padding: '12px 14px', color: '#e2e8f0',
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'sans-serif', transition: 'border-color 0.2s',
};

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%', marginTop: '20px', padding: '13px', borderRadius: '12px', border: 'none',
  background: disabled ? '#1e1b3a' : '#7c3aed',
  color: disabled ? '#475569' : '#fff',
  fontSize: '0.9rem', fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s',
});