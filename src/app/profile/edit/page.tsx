'use client';

// src/app/profile/edit/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

export default function ProfileEditPage() {
  const [displayName,   setDisplayName]   = useState('');
  const [bio,           setBio]           = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarUrl,     setAvatarUrl]     = useState('');
  const [saving,        setSaving]        = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [error,         setError]         = useState('');
  const fileRef  = useRef<HTMLInputElement>(null);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }
      const { data } = await supabase
        .from('profiles').select('display_name, bio, avatar_url')
        .eq('id', user.id).maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? '');
        setBio(data.bio ?? '');
        setAvatarUrl(data.avatar_url ?? '');
        setAvatarPreview(data.avatar_url ?? '');
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true); setError('');
    const fd = new FormData();
    fd.append('file', file);
    const res  = await fetch('/api/profile/avatar', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? '업로드 실패'); setAvatarPreview(avatarUrl); }
    else setAvatarUrl(data.url);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    if (!displayName.trim()) { setError('이름을 입력해주세요'); return; }
    setSaving(true); setError('');
    const res = await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, bio }),
    });
    if (!res.ok) { setError('저장 실패'); setSaving(false); return; }
    setSaved(true);
    setTimeout(() => { setSaved(false); router.back(); }, 1000);
    setSaving(false);
  };

  const initial = displayName.charAt(0).toUpperCase() || '?';

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '560px', margin: '0 auto', fontFamily: 'sans-serif', color: '#e2e8f0' }}>
        {/* 헤더 */}
        <div style={{ borderBottom: '1px solid #1e1b3a', padding: '18px 20px', position: 'sticky', top: 0, background: '#080810', zIndex: 10, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: '#a78bfa', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1, padding: 0 }}>←</button>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0' }}>프로필 수정</h1>
          <button onClick={handleSave} disabled={saving || !displayName.trim()} style={{
            marginLeft: 'auto', padding: '7px 18px', borderRadius: '20px', border: 'none',
            background: saving || !displayName.trim() ? '#1e1b3a' : '#7c3aed',
            color: saving || !displayName.trim() ? '#475569' : '#fff',
            fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {saved ? '✓ 저장됨' : saving ? '저장 중...' : '저장'}
          </button>
        </div>

        <div style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 아바타 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ position: 'relative' }}>
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="avatar" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid #7c3aed', display: 'block' }} />
              ) : (
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem', fontWeight: 700, color: '#fff', border: '3px solid #7c3aed' }}>
                  {initial}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ position: 'absolute', bottom: 2, right: 2, width: 32, height: 32, borderRadius: '50%', background: '#7c3aed', border: '2px solid #080810', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}
              >
                {uploading ? '⏳' : '📷'}
              </button>
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ background: 'transparent', border: '1px solid #334155', borderRadius: '20px', padding: '7px 18px', color: '#94a3b8', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#334155'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
            >
              {uploading ? '업로드 중...' : '사진 변경'}
            </button>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#334155' }}>JPG, PNG, WEBP · 최대 3MB</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
          </div>

          {/* 이름 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              표시 이름 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="표시될 이름" maxLength={30}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={e  => { e.target.style.borderColor = '#1e1b3a'; }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#334155', textAlign: 'right' }}>{displayName.length}/30</p>
          </div>

          {/* 소개 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              소개 <span style={{ color: '#475569' }}>(선택)</span>
            </label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="간단한 자기소개" rows={4} maxLength={150}
              style={{ ...inputStyle, resize: 'none' }}
              onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={e  => { e.target.style.borderColor = '#1e1b3a'; }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#334155', textAlign: 'right' }}>{bio.length}/150</p>
          </div>

          {error && <p style={{ fontSize: '0.82rem', color: '#ef4444', textAlign: 'center', margin: 0 }}>{error}</p>}

          <div style={{ paddingTop: '8px', borderTop: '1px solid #1e1b3a', display: 'flex', justifyContent: 'center' }}>
            <Link href="/settings" style={{ fontSize: '0.82rem', color: '#64748b', textDecoration: 'none' }}>
              ⚙️ 더 많은 설정 →
            </Link>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0f0f1f', border: '1px solid #1e1b3a',
  borderRadius: '12px', padding: '12px 14px', color: '#e2e8f0',
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'sans-serif', transition: 'border-color 0.2s',
};