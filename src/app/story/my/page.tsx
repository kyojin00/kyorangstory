'use client';

// src/app/story/my/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Story, EMOTION_COLOR } from '@/types/story.types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function MyPage() {
  const [user,    setUser]    = useState<User | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }
      setUser(user);

      const { data } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setStories(data ?? []);
      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const handleDelete = async (storyId: string) => {
    if (!confirm('이 글을 삭제할까요?')) return;
    setDeleting(storyId);
    await supabase.from('stories').delete().eq('id', storyId);
    setStories(prev => prev.filter(s => s.id !== storyId));
    setDeleting(null);
  };

  const name      = (user?.user_metadata?.full_name as string)
                 || (user?.user_metadata?.name as string)
                 || user?.email?.split('@')[0]
                 || '익명';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initial   = name.charAt(0).toUpperCase();
  const joinDate  = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#e2e8f0', fontFamily: 'sans-serif' }}>

      {/* 헤더 */}
      <div style={{
        borderBottom: '1px solid #1e1b3a',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'sticky',
        top: 0,
        background: '#080810',
        zIndex: 10,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '1.3rem', padding: 0 }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#a78bfa', flex: 1 }}>
          마이페이지
        </h1>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '80px' }}>

        {/* 프로필 카드 */}
        <div style={{
          background: '#0f0f1f',
          border: '1px solid #1e1b3a',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          marginBottom: '24px',
        }}>
          {/* 아바타 */}
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: '3px solid #7c3aed',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}>
              {initial}
            </div>
          )}

          {/* 정보 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '1rem', color: '#e2e8f0' }}>
              {name}
            </p>
            <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#334155' }}>
              {joinDate} 가입
            </p>
          </div>
        </div>

        {/* 통계 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '28px',
        }}>
          {[
            { label: '작성한 글', value: stories.length, icon: '✍️' },
            { label: '받은 공감', value: stories.reduce((a, s) => a + s.likes_count, 0), icon: '❤️' },
          ].map(item => (
            <div key={item.label} style={{
              background: '#0f0f1f',
              border: '1px solid #1e1b3a',
              borderRadius: '16px',
              padding: '18px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{item.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a78bfa', marginBottom: '4px' }}>
                {item.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* 내 글 목록 */}
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px', fontWeight: 600 }}>
          ✍️ 내가 쓴 글 {stories.length}개
        </p>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#334155', marginTop: '40px' }}>불러오는 중...</p>
        ) : stories.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 0',
            color: '#334155',
            fontSize: '0.875rem',
            lineHeight: 1.7,
          }}>
            아직 작성한 글이 없어요.<br />
            마음을 털어놔 보세요 💜
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stories.map(story => (
              <div
                key={story.id}
                style={{
                  background: '#0f0f1f',
                  border: '1px solid #1e1b3a',
                  borderRadius: '14px',
                  padding: '14px',
                }}
              >
                {/* 감정 태그 + 시간 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {story.emotion_tags.map(tag => (
                      <span key={tag} style={{
                        fontSize: '0.68rem',
                        padding: '2px 7px',
                        borderRadius: '8px',
                        background: EMOTION_COLOR[tag] + '33',
                        color: EMOTION_COLOR[tag],
                        border: `1px solid ${EMOTION_COLOR[tag]}55`,
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#475569', flexShrink: 0, marginLeft: '8px' }}>
                    {timeAgo(story.created_at)}
                  </span>
                </div>

                {/* 본문 */}
                <p
                  onClick={() => router.push(`/story/${story.id}`)}
                  style={{
                    margin: '0 0 10px',
                    fontSize: '0.875rem',
                    color: '#cbd5e1',
                    lineHeight: 1.6,
                    cursor: 'pointer',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {story.content}
                </p>

                {/* 반응 + 삭제 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#475569' }}>❤️ {story.likes_count}</span>
                  <span style={{ fontSize: '0.75rem', color: '#475569' }}>💬 {story.comments_count}</span>
                  <button
                    onClick={() => handleDelete(story.id)}
                    disabled={deleting === story.id}
                    style={{
                      marginLeft: 'auto',
                      background: 'transparent',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      color: '#ef4444',
                      cursor: 'pointer',
                    }}
                  >
                    {deleting === story.id ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 로그아웃 */}
        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            marginTop: '32px',
            padding: '13px',
            borderRadius: '12px',
            border: '1px solid #334155',
            background: 'transparent',
            color: '#64748b',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}