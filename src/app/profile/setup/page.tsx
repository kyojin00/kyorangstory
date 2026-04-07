'use client';

// src/app/profile/setup/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ProfileSetupPage() {
  const [username,    setUsername]    = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio,         setBio]         = useState('');
  const [loading,     setLoading]     = useState(false);
  const [checking,    setChecking]    = useState(false);
  const [usernameOk,  setUsernameOk]  = useState<boolean | null>(null);
  const [error,       setError]       = useState('');
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

  // username 유효성 검사
  const validateUsername = (val: string) => /^[a-z0-9_.]{3,20}$/.test(val);

  // username 중복 확인 (디바운스 500ms)
  useEffect(() => {
    if (!validateUsername(username)) { setUsernameOk(null); return; }
    const t = setTimeout(async () => {
      setChecking(true);
      const res  = await fetch(`/api/profile/check?username=${username}`);
      const data = await res.json();
      setUsernameOk(data.available);
      setChecking(false);
    }, 500);
    return () => clearTimeout(t);
  }, [username]);

  const handleSubmit = async () => {
    if (!usernameOk || !displayName.trim() || loading) return;
    setLoading(true);
    setError('');

    const res  = await fetch('/api/profile', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, display_name: displayName, bio }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? '오류가 발생했어요');
      setLoading(false);
      return;
    }
    router.replace('/feed');
  };

  const usernameStatus = () => {
    if (!username) return null;
    if (!validateUsername(username)) return { color: '#ef4444', msg: '영문 소문자, 숫자, . _ 만 가능 (3~20자)' };
    if (checking)         return { color: '#94a3b8', msg: '확인 중...' };
    if (usernameOk === true)  return { color: '#22c55e', msg: '✓ 사용 가능한 아이디예요' };
    if (usernameOk === false) return { color: '#ef4444', msg: '이미 사용 중인 아이디예요' };
    return null;
  };

  const status   = usernameStatus();
  const canSubmit = usernameOk === true && displayName.trim().length > 0 && !loading;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080810',
      color: '#e2e8f0',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>👤</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800, color: '#e2e8f0' }}>
            프로필 만들기
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            비익명 모드에서 사용할 프로필이에요
          </p>
        </div>

        {/* 입력 폼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* username */}
          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px', display: 'block' }}>
              아이디 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.9rem',
              }}>
                @
              </span>
              <input
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                placeholder="kyorang_user"
                maxLength={20}
                style={{ ...inputStyle, paddingLeft: '28px' }}
                onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
                onBlur={e  => { e.target.style.borderColor = '#1e1b3a'; }}
              />
            </div>
            {status && (
              <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: status.color }}>
                {status.msg}
              </p>
            )}
          </div>

          {/* display_name */}
          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px', display: 'block' }}>
              표시 이름 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="교랑이"
              maxLength={30}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={e  => { e.target.style.borderColor = '#1e1b3a'; }}
            />
          </div>

          {/* bio */}
          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px', display: 'block' }}>
              소개 <span style={{ color: '#475569' }}>(선택)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="간단한 자기소개를 써보세요"
              rows={3}
              maxLength={150}
              style={{ ...inputStyle, resize: 'none' }}
              onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={e  => { e.target.style.borderColor = '#1e1b3a'; }}
            />
            <p style={{ textAlign: 'right', fontSize: '0.72rem', color: '#334155', margin: '4px 0 0' }}>
              {bio.length}/150
            </p>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <p style={{
            background: '#ef444420', border: '1px solid #ef4444',
            borderRadius: '10px', padding: '10px 14px',
            fontSize: '0.83rem', color: '#ef4444', margin: '16px 0 0',
          }}>
            {error}
          </p>
        )}

        {/* 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%', marginTop: '24px', padding: '14px',
            borderRadius: '14px', border: 'none',
            background: canSubmit ? '#7c3aed' : '#1e1b3a',
            color: canSubmit ? '#fff' : '#475569',
            fontSize: '0.95rem', fontWeight: 700,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {loading ? '생성 중...' : '프로필 만들기'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#334155', marginTop: '16px' }}>
          나중에 설정에서 언제든지 수정할 수 있어요
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0f0f1f',
  border: '1px solid #1e1b3a',
  borderRadius: '12px',
  padding: '12px 14px',
  color: '#e2e8f0',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'sans-serif',
  transition: 'border-color 0.2s',
};