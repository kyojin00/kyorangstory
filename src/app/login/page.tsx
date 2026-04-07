'use client';

// src/app/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [tab,      setTab]      = useState<'login' | 'signup'>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'kakao' | null>(null);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/feed');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) { setError('이메일과 비밀번호를 입력해주세요'); return; }
    if (tab === 'signup' && !name.trim()) { setError('이름을 입력해주세요'); return; }
    setLoading(true); setError(''); setSuccess('');

    if (tab === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError('이메일 또는 비밀번호가 올바르지 않아요'); setLoading(false); return; }
      router.replace('/feed');
    } else {
      const { error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      if (err) { setError(err.message); setLoading(false); return; }
      setSuccess('가입 완료! 이메일을 확인해주세요 📬');
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'kakao') => {
    setOauthLoading(provider);
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes: provider === 'kakao' ? 'profile_nickname profile_image' : undefined,
      },
    });
    if (err) { setError('로그인 중 오류가 발생했어요'); setOauthLoading(null); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#080810',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'sans-serif', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🌙</div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.6rem', fontWeight: 900, color: '#a78bfa', letterSpacing: '-0.5px' }}>
            교랑 스토리
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            판단 없이 마음을 털어놓는 공간
          </p>
        </div>

        {/* 소셜 로그인 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => handleOAuth('google')}
            disabled={!!oauthLoading}
            style={{
              width: '100%', padding: '13px', borderRadius: '14px',
              border: '1px solid #1e1b3a', background: '#0f0f1f',
              color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600,
              cursor: oauthLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'all 0.15s', opacity: oauthLoading && oauthLoading !== 'google' ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!oauthLoading) (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1b3a'; }}
          >
            {oauthLoading === 'google' ? (
              '연결 중...'
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google로 계속하기
              </>
            )}
          </button>

          <button
            onClick={() => handleOAuth('kakao')}
            disabled={!!oauthLoading}
            style={{
              width: '100%', padding: '13px', borderRadius: '14px',
              border: 'none', background: '#FEE500',
              color: '#191919', fontSize: '0.9rem', fontWeight: 700,
              cursor: oauthLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'all 0.15s', opacity: oauthLoading && oauthLoading !== 'kakao' ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!oauthLoading) (e.currentTarget as HTMLElement).style.background = '#F7DC00'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FEE500'; }}
          >
            {oauthLoading === 'kakao' ? (
              '연결 중...'
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919">
                  <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.548 1.523 4.78 3.8 6.15L4.9 20.1c-.1.3.2.6.5.5l4.2-2.8c.8.1 1.6.2 2.4.2 5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
                </svg>
                카카오로 계속하기
              </>
            )}
          </button>
        </div>

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: '#1e1b3a' }} />
          <span style={{ fontSize: '0.78rem', color: '#334155' }}>또는 이메일로</span>
          <div style={{ flex: 1, height: '1px', background: '#1e1b3a' }} />
        </div>

        {/* 이메일/비밀번호 탭 */}
        <div style={{ display: 'flex', background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
          {(['login', 'signup'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }} style={{
              flex: 1, padding: '9px', borderRadius: '9px', border: 'none',
              background: tab === t ? '#7c3aed' : 'transparent',
              color: tab === t ? '#fff' : '#64748b',
              fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {t === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 입력 폼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tab === 'signup' && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="이름"
              style={inputStyle}
              onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={e   => { e.target.style.borderColor = '#1e1b3a'; }} />
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" type="email"
            onKeyDown={e => { if (e.key === 'Enter') handleEmailAuth(); }}
            style={inputStyle}
            onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
            onBlur={e   => { e.target.style.borderColor = '#1e1b3a'; }} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" type="password"
            onKeyDown={e => { if (e.key === 'Enter') handleEmailAuth(); }}
            style={inputStyle}
            onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
            onBlur={e   => { e.target.style.borderColor = '#1e1b3a'; }} />
        </div>

        {error   && <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#ef4444', textAlign: 'center' }}>{error}</p>}
        {success && <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#22c55e', textAlign: 'center' }}>{success}</p>}

        <button
          onClick={handleEmailAuth}
          disabled={loading}
          style={{
            width: '100%', marginTop: '14px', padding: '13px', borderRadius: '14px', border: 'none',
            background: loading ? '#1e1b3a' : '#7c3aed',
            color: loading ? '#475569' : '#fff',
            fontSize: '0.9rem', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
          }}
        >
          {loading ? '처리 중...' : tab === 'login' ? '로그인' : '가입하기'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#334155', marginTop: '20px', lineHeight: 1.6 }}>
          계속 진행하면 <span style={{ color: '#7c3aed' }}>서비스 이용약관</span>과<br />
          <span style={{ color: '#7c3aed' }}>개인정보처리방침</span>에 동의하는 것으로 간주돼요.
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0f0f1f', border: '1px solid #1e1b3a',
  borderRadius: '14px', padding: '13px 16px', color: '#e2e8f0',
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'sans-serif', transition: 'border-color 0.2s',
};