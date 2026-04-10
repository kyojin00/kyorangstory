'use client';

// src/app/profile/edit/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0c0c1e', border: '1.5px solid #1a1830',
  borderRadius: '14px', padding: '12px 16px', color: '#c4b5fd',
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.2s',
};

export default function ProfileEditPage() {
  const [displayName,   setDisplayName]   = useState('');
  const [bio,           setBio]           = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarUrl,     setAvatarUrl]     = useState('');
  const [saving,        setSaving]        = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [error,         setError]         = useState('');
  const [resetting,     setResetting]     = useState(false);
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

  // 사진 초기화 (기본 아바타로)
  const handleResetAvatar = async () => {
    if (!confirm('프로필 사진을 삭제하고 기본 아바타로 초기화할까요?')) return;
    setResetting(true); setError('');
    const res = await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: null }),
    });
    if (!res.ok) { setError('초기화 실패'); setResetting(false); return; }
    setAvatarUrl('');
    setAvatarPreview('');
    setResetting(false);
  };

  const handleSave = async () => {
    if (!displayName.trim()) { setError('이름을 입력해주세요'); return; }
    setSaving(true); setError('');
    const res = await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, bio, avatar_url: avatarUrl || null }),
    });
    if (!res.ok) { setError('저장 실패'); setSaving(false); return; }
    setSaved(true);
    setTimeout(() => { setSaved(false); router.back(); }, 1000);
    setSaving(false);
  };

  const initial = displayName.charAt(0).toUpperCase() || '?';
  const canSave = !saving && !uploading && displayName.trim().length > 0;

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '580px', margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{
          padding: '14px 24px', position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(6,6,16,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #0f0f22',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <button
            onClick={() => router.back()}
            style={{ background: '#12112a', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: '7px 12px', borderRadius: '10px', fontFamily: 'inherit' }}
          >← 뒤로</button>
          <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em' }}>프로필 수정</h1>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              marginLeft: 'auto', padding: '8px 20px', borderRadius: '12px', border: 'none',
              background: canSave ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#12112a',
              color: canSave ? '#fff' : '#2d2b50',
              fontSize: '0.84rem', fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed',
              boxShadow: canSave ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            {saved ? '✓ 저장됨' : saving ? '저장 중...' : '저장'}
          </button>
        </div>

        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* 아바타 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="avatar" style={{
                  width: 104, height: 104, borderRadius: '50%', objectFit: 'cover',
                  border: '3px solid rgba(124,58,237,0.4)', display: 'block',
                  boxShadow: '0 0 0 3px rgba(124,58,237,0.1)',
                }} />
              ) : (
                <div style={{
                  width: 104, height: 104, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.4rem', fontWeight: 700, color: '#fff',
                  border: '3px solid rgba(124,58,237,0.4)',
                  boxShadow: '0 0 0 3px rgba(124,58,237,0.1)',
                }}>
                  {initial}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  position: 'absolute', bottom: 2, right: 2,
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#7c3aed', border: '2px solid #06060f',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.88rem', boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
                }}
              >
                {uploading ? '⏳' : '📷'}
              </button>
            </div>

            {/* 버튼 행 */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  background: 'transparent', border: '1px solid #1a1830',
                  borderRadius: '12px', padding: '8px 18px',
                  color: '#4a5568', fontSize: '0.82rem', cursor: 'pointer',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#7c3aed44'; el.style.color = '#a78bfa'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1a1830'; el.style.color = '#4a5568'; }}
              >
                {uploading ? '업로드 중...' : '📷 사진 변경'}
              </button>

              {/* 초기화 버튼 — 사진 있을 때만 표시 */}
              {avatarPreview && (
                <button
                  onClick={handleResetAvatar}
                  disabled={resetting}
                  style={{
                    background: 'transparent', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: '12px', padding: '8px 16px',
                    color: '#f87171', fontSize: '0.82rem', cursor: resetting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(239,68,68,0.08)'; el.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                >
                  {resetting ? '초기화 중...' : '🗑️ 사진 삭제'}
                </button>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '0.72rem', color: '#2d2b50' }}>JPG, PNG, WEBP · 최대 3MB</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
          </div>

          {/* 구분선 */}
          <div style={{ height: '1px', background: '#0f0f22' }} />

          {/* 이름 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#2d2b50', marginBottom: '8px', letterSpacing: '0.04em' }}>
              표시 이름 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="표시될 이름"
              maxLength={30}
              style={inputStyle}
              onFocus={e  => { e.target.style.borderColor = '#7c3aed55'; }}
              onBlur={e   => { e.target.style.borderColor = '#1a1830'; }}
            />
            <p style={{ margin: '5px 0 0', fontSize: '0.7rem', color: '#2d2b50', textAlign: 'right' }}>{displayName.length}/30</p>
          </div>

          {/* 소개 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#2d2b50', marginBottom: '8px', letterSpacing: '0.04em' }}>
              소개 <span style={{ color: '#1e1c3a' }}>(선택)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="간단한 자기소개"
              rows={4}
              maxLength={150}
              style={{ ...inputStyle, resize: 'none' }}
              onFocus={e  => { e.target.style.borderColor = '#7c3aed55'; }}
              onBlur={e   => { e.target.style.borderColor = '#1a1830'; }}
            />
            <p style={{ margin: '5px 0 0', fontSize: '0.7rem', color: '#2d2b50', textAlign: 'right' }}>{bio.length}/150</p>
          </div>

          {/* 에러 */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#f87171' }}>{error}</p>
            </div>
          )}

          {/* 하단 링크 */}
          <div style={{ paddingTop: '8px', borderTop: '1px solid #0f0f22', display: 'flex', justifyContent: 'center' }}>
            <Link href="/settings" style={{ fontSize: '0.8rem', color: '#2d2b50', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#7c6fa0'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#2d2b50'; }}
            >
              ⚙️ 더 많은 설정 →
            </Link>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}