'use client';

// src/app/page.tsx

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup';

export default function HomePage() {
  const [mode,     setMode]     = useState<Mode>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState<'email' | 'google' | 'kakao' | null>(null);
  const [message,  setMessage]  = useState('');
  const [error,    setError]    = useState('');

  const supabase = createClient();

  // ── 이메일 로그인 / 회원가입 ──
  const handleEmail = async () => {
    if (!email || !password || loading) return;
    setLoading('email');
    setError('');
    setMessage('');

    if (mode === 'signup') {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (err) {
        setError(err.message);
      } else {
        setMessage('📧 인증 메일을 보냈어요! 메일함을 확인해주세요.');
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError('이메일 또는 비밀번호가 올바르지 않아요.');
      } else {
        location.href = '/story';
      }
    }
    setLoading(null);
  };

  // ── OAuth ──
  const handleOAuth = async (provider: 'google' | 'kakao') => {
    setLoading(provider);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  const isEmailLoading = loading === 'email';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080810',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      padding: '0 24px',
    }}>

      {/* 로고 */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <img src="/logo.png" alt="kyorang" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: '12px' }} />
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#a78bfa' }}>
          교랑 스토리
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
          익명으로 마음을 털어놓는 공간<br />
          아무도 당신을 판단하지 않아요
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '340px' }}>

        {/* 탭 */}
        <div style={{
          display: 'flex',
          background: '#0f0f1f',
          border: '1px solid #1e1b3a',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
        }}>
          {(['login', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setMessage(''); }}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: '9px',
                border: 'none',
                background: mode === m ? '#7c3aed' : 'transparent',
                color: mode === m ? '#fff' : '#64748b',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 이메일 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="이메일"
            style={inputStyle}
            onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
            onBlur={e   => { e.target.style.borderColor = '#1e1b3a'; }}
            onKeyDown={e => { if (e.key === 'Enter') handleEmail(); }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호 (6자리 이상)"
            style={inputStyle}
            onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
            onBlur={e   => { e.target.style.borderColor = '#1e1b3a'; }}
            onKeyDown={e => { if (e.key === 'Enter') handleEmail(); }}
          />
        </div>

        {/* 에러 / 성공 메시지 */}
        {error && (
          <p style={{ fontSize: '0.8rem', color: '#ef4444', margin: '0 0 12px', textAlign: 'center' }}>
            {error}
          </p>
        )}
        {message && (
          <p style={{ fontSize: '0.8rem', color: '#22c55e', margin: '0 0 12px', textAlign: 'center', lineHeight: 1.5 }}>
            {message}
          </p>
        )}

        {/* 이메일 버튼 */}
        <button
          onClick={handleEmail}
          disabled={!email || !password || loading !== null}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: '12px',
            border: 'none',
            background: email && password && !loading ? '#7c3aed' : '#1e1b3a',
            color: email && password && !loading ? '#fff' : '#475569',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: email && password && !loading ? 'pointer' : 'not-allowed',
            marginBottom: '20px',
            transition: 'all 0.2s',
          }}
        >
          {isEmailLoading
            ? '처리 중...'
            : mode === 'login' ? '이메일로 로그인' : '이메일로 회원가입'}
        </button>

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', background: '#1e1b3a' }} />
          <span style={{ fontSize: '0.75rem', color: '#334155' }}>또는</span>
          <div style={{ flex: 1, height: '1px', background: '#1e1b3a' }} />
        </div>

        {/* OAuth 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Google */}
          <button
            onClick={() => handleOAuth('google')}
            disabled={loading !== null}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              border: '1px solid #1e1b3a',
              background: '#0f0f1f',
              color: '#e2e8f0',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: loading !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {loading === 'google' ? '연결 중...' : 'Google로 계속하기'}
          </button>

          {/* Kakao */}
          <button
            onClick={() => handleOAuth('kakao')}
            disabled={loading !== null}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: loading === 'kakao' ? '#c9a800' : '#FEE500',
              color: '#191919',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: loading !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.56 5.07 3.9 6.48l-.99 3.67 4.28-2.82c.88.18 1.82.27 2.81.27 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"/>
            </svg>
            {loading === 'kakao' ? '연결 중...' : '카카오로 계속하기'}
          </button>
        </div>

        {/* 하단 안내 */}
        <p style={{
          marginTop: '28px',
          fontSize: '0.72rem',
          color: '#334155',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          로그인 후에도 게시글은 익명으로 표시됩니다.<br />
          신원은 절대 노출되지 않아요 🔒
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