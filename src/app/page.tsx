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
      if (data.user) router.replace('/story');
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
      router.replace('/story');
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (err) { setError(err.message); setLoading(false); return; }
      setSuccess('가입 완료! 이메일을 확인해주세요 📬');
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'kakao') => {
    setOauthLoading(provider); setError('');
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
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #FFFDF9 0%, #FFF4E8 50%, #FFF0E0 100%)',
      display: 'flex', fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      {/* 왼쪽 일러스트 패널 */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px', position: 'relative', overflow: 'hidden',
      }}>
        {/* 배경 장식 */}
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(232, 149, 109, 0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '5%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(124, 58, 237, 0.05)', pointerEvents: 'none' }} />

        {/* 로고 + 타이틀 */}
        <div style={{ textAlign: 'center', animation: 'fadeIn 0.8s ease', position: 'relative', zIndex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="kyorang" style={{ width: 100, height: 100, objectFit: 'contain', marginBottom: '20px', filter: 'drop-shadow(0 8px 24px rgba(232,149,109,0.2))' }} />
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#1C1917', margin: '0 0 12px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            교랑 스토리
          </h1>
          <p style={{ fontSize: '1rem', color: '#78716C', lineHeight: 1.7, maxWidth: '360px' }}>
            판단 없이 마음을 털어놓는 공간.<br />
            익명으로 감정을 나누고, 따뜻한 공감을 받아보세요.
          </p>

          {/* 특징 카드들 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '36px', maxWidth: '320px', textAlign: 'left' }}>
            {[
              { icon: '🌙', title: '익명 피드', desc: '신원 노출 없이 솔직하게' },
              { icon: '💭', title: '1:1 상담', desc: '언제든 이야기 들어드려요' },
              { icon: '🔍', title: '대화 분석', desc: '카톡 대화 감정 분석' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: 'rgba(255,255,255,0.7)', borderRadius: '12px', border: '1px solid rgba(232,149,109,0.15)', backdropFilter: 'blur(8px)' }}>
                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#1C1917' }}>{f.title}</p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#78716C' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 오른쪽 로그인 패널 */}
      <div style={{
        width: '460px', flexShrink: 0,
        background: '#FFFFFF',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.06)',
      }}>
        <div style={{ width: '100%', maxWidth: '360px', animation: 'slideIn 0.6s ease' }}>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1C1917', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            {tab === 'login' ? '다시 만나서 반가워요 👋' : '함께해요 💜'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#78716C', margin: '0 0 28px' }}>
            {tab === 'login' ? '로그인하고 이야기를 나눠보세요' : '지금 가입하면 모든 기능을 이용할 수 있어요'}
          </p>

          {/* 소셜 로그인 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
            <button onClick={() => handleOAuth('google')} disabled={!!oauthLoading} style={{
              width: '100%', padding: '13px', borderRadius: '12px',
              border: '1.5px solid #E8E4E0', background: '#fff',
              color: '#1C1917', fontSize: '0.9rem', fontWeight: 600,
              cursor: oauthLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'all 0.15s', opacity: oauthLoading && oauthLoading !== 'google' ? 0.5 : 1,
              boxShadow: 'var(--shadow-sm)',
            }}
              onMouseEnter={e => { if (!oauthLoading) (e.currentTarget as HTMLElement).style.borderColor = '#E8956D'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E8E4E0'; }}
            >
              {oauthLoading === 'google' ? '연결 중...' : (
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

            <button onClick={() => handleOAuth('kakao')} disabled={!!oauthLoading} style={{
              width: '100%', padding: '13px', borderRadius: '12px',
              border: 'none', background: '#FEE500',
              color: '#191919', fontSize: '0.9rem', fontWeight: 700,
              cursor: oauthLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'all 0.15s', opacity: oauthLoading && oauthLoading !== 'kakao' ? 0.5 : 1,
              boxShadow: 'var(--shadow-sm)',
            }}
              onMouseEnter={e => { if (!oauthLoading) (e.currentTarget as HTMLElement).style.background = '#F7DC00'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FEE500'; }}
            >
              {oauthLoading === 'kakao' ? '연결 중...' : (
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
            <div style={{ flex: 1, height: '1px', background: '#EDE8E0' }} />
            <span style={{ fontSize: '0.75rem', color: '#A8A29E' }}>또는 이메일로</span>
            <div style={{ flex: 1, height: '1px', background: '#EDE8E0' }} />
          </div>

          {/* 탭 */}
          <div style={{ display: 'flex', background: '#FFF8F0', borderRadius: '12px', padding: '4px', marginBottom: '16px', border: '1px solid #EDE8E0' }}>
            {(['login', 'signup'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }} style={{
                flex: 1, padding: '9px', borderRadius: '9px', border: 'none',
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? '#1C1917' : '#78716C',
                fontSize: '0.875rem', fontWeight: tab === t ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
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
                onFocus={e  => { e.target.style.borderColor = '#E8956D'; e.target.style.boxShadow = '0 0 0 3px rgba(232,149,109,0.12)'; }}
                onBlur={e   => { e.target.style.borderColor = '#EDE8E0'; e.target.style.boxShadow = 'none'; }}
              />
            )}
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" type="email"
              onKeyDown={e => { if (e.key === 'Enter') handleEmailAuth(); }}
              style={inputStyle}
              onFocus={e  => { e.target.style.borderColor = '#E8956D'; e.target.style.boxShadow = '0 0 0 3px rgba(232,149,109,0.12)'; }}
              onBlur={e   => { e.target.style.borderColor = '#EDE8E0'; e.target.style.boxShadow = 'none'; }}
            />
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" type="password"
              onKeyDown={e => { if (e.key === 'Enter') handleEmailAuth(); }}
              style={inputStyle}
              onFocus={e  => { e.target.style.borderColor = '#E8956D'; e.target.style.boxShadow = '0 0 0 3px rgba(232,149,109,0.12)'; }}
              onBlur={e   => { e.target.style.borderColor = '#EDE8E0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {error   && <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#DC2626', textAlign: 'center', padding: '8px 12px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>{error}</p>}
          {success && <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#16A34A', textAlign: 'center', padding: '8px 12px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>{success}</p>}

          <button onClick={handleEmailAuth} disabled={loading} style={{
            width: '100%', marginTop: '14px', padding: '14px', borderRadius: '12px', border: 'none',
            background: loading ? '#EDE8E0' : 'linear-gradient(135deg, #E8956D, #D4724A)',
            color: loading ? '#A8A29E' : '#fff',
            fontSize: '0.9rem', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(232, 149, 109, 0.4)',
          }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            {loading ? '처리 중...' : tab === 'login' ? '로그인' : '가입하기'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#A8A29E', marginTop: '20px', lineHeight: 1.7 }}>
            계속하면 <span style={{ color: '#E8956D', cursor: 'pointer' }}>이용약관</span>과{' '}
            <span style={{ color: '#E8956D', cursor: 'pointer' }}>개인정보처리방침</span>에 동의하게 됩니다.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#FAFAF8', border: '1.5px solid #EDE8E0',
  borderRadius: '12px', padding: '12px 16px', color: '#1C1917',
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Noto Sans KR', sans-serif", transition: 'all 0.15s',
};