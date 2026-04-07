'use client';

// src/components/StoryHeader.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Props {
  title?:    string;
  showBack?: boolean;
}

export default function StoryHeader({ title = '교랑 스토리', showBack = false }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name      = (user?.user_metadata?.full_name as string)
                 || (user?.user_metadata?.name as string)
                 || user?.email?.split('@')[0]
                 || '익명';
  const initial   = name.charAt(0).toUpperCase();

  return (
    <div style={{
      borderBottom: '1px solid #1e1b3a',
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      position: 'sticky',
      top: 0,
      background: '#080810',
      zIndex: 10,
    }}>

      {/* 뒤로가기 */}
      {showBack && (
        <button
          onClick={() => router.back()}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#a78bfa',
            cursor: 'pointer',
            fontSize: '1.3rem',
            padding: 0,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ←
        </button>
      )}

      {/* 타이틀 */}
      <h1 style={{
        margin: 0,
        fontSize: '1.05rem',
        fontWeight: 700,
        color: '#a78bfa',
        flex: 1,
      }}>
        {!showBack && '🌙 '}{title}
      </h1>

      {/* 피드 이동 버튼 */}
      <Link
        href="/feed"
        style={{
          fontSize: '0.78rem',
          color: '#64748b',
          border: '1px solid #1e1b3a',
          borderRadius: '16px',
          padding: '5px 12px',
          textDecoration: 'none',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        🏠 피드
      </Link>

      {/* 프로필 아바타 */}
      {user ? (
        <button
          onClick={() => router.push('/story/my')}
          title={name}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{
            fontSize: '0.8rem',
            color: '#94a3b8',
            maxWidth: '80px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {name}
          </span>

          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px solid #7c3aed',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#7c3aed',
              border: '2px solid #5b21b6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}>
              {initial}
            </div>
          )}
        </button>
      ) : (
        <button
          onClick={() => router.push('/')}
          style={{
            background: '#7c3aed',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 14px',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          로그인
        </button>
      )}
    </div>
  );
}