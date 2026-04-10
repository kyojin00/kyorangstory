'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Props { title?: string; showBack?: boolean; }

export default function StoryHeader({ title = '교랑 스토리', showBack = false }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || user?.email?.split('@')[0] || '익명';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div style={{
      padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px',
      position: 'sticky', top: 0, zIndex: 10,
      background: 'rgba(6,6,16,0.9)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #12112a',
    }}>
      {showBack && (
        <button
          onClick={() => router.back()}
          style={{
            background: '#12112a', border: 'none', color: '#a78bfa',
            cursor: 'pointer', fontSize: '0.9rem', padding: '7px 10px',
            borderRadius: '10px', lineHeight: 1, flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#12112a'; }}
        >
          ← 뒤로
        </button>
      )}

      <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#c4b5fd', flex: 1, letterSpacing: '-0.02em' }}>
        {!showBack && '🌙 '}{title}
      </h1>

      <Link
        href="/feed"
        style={{
          fontSize: '0.75rem', color: '#4a5568',
          border: '1px solid #1a1830', borderRadius: '10px',
          padding: '6px 12px', textDecoration: 'none', fontWeight: 600, flexShrink: 0,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#7c3aed44'; el.style.color = '#7c6fa0'; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1a1830'; el.style.color = '#4a5568'; }}
      >
        🏠 피드
      </Link>

      {user ? (
        <button
          onClick={() => router.push('/story/my')}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#3d3660', maxWidth: '72px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #7c3aed44', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
              border: '2px solid #7c3aed44',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.78rem', fontWeight: 700, color: '#fff',
            }}>{initial}</div>
          )}
        </button>
      ) : (
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            border: 'none', borderRadius: '10px', padding: '7px 16px',
            color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
          }}
        >로그인</button>
      )}
    </div>
  );
}