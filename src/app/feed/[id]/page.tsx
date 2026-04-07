'use client';

// src/app/feed/[id]/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Post, PostComment } from '@/types/profile';
import SidebarLayout from '@/components/SidebarLayout';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function Avatar({ url, name, size = 36 }: { url?: string; name?: string; size?: number }) {
  const initial = (name ?? '?').charAt(0).toUpperCase();
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff' }}>
      {initial}
    </div>
  );
}

function PostImages({ images }: { images?: string[] }) {
  if (!images?.length) return null;
  const count = images.length;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: count === 1 ? '1fr' : count === 3 ? '2fr 1fr' : 'repeat(2, 1fr)', gap: '3px', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
      {images.slice(0, 4).map((url, i) => (
        <div key={url} style={{ aspectRatio: count === 1 ? '16/9' : '1', gridRow: count === 3 && i === 0 ? 'span 2' : 'auto' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
    </div>
  );
}

export default function PostDetailPage() {
  const params   = useParams<{ id: string }>();
  const id       = params?.id ?? '';
  const supabase = createClient();

  const [post,        setPost]        = useState<Post | null>(null);
  const [comments,    setComments]    = useState<PostComment[]>([]);
  const [myId,        setMyId]        = useState<string | null>(null);
  const [input,       setInput]       = useState('');
  const [posting,     setPosting]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [menuOpen,    setMenuOpen]    = useState<string | null>(null); // commentId
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editText,    setEditText]    = useState('');
  const [editSaving,  setEditSaving]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchPost = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: postData } = await supabase
      .from('posts').select('*').eq('id', id).maybeSingle();
    if (!postData) { setPost(null); return; }

    const { data: profile } = await supabase
      .from('profiles').select('id, username, display_name, avatar_url')
      .eq('id', postData.user_id).maybeSingle();

    let is_liked = false;
    if (user) {
      const { data: like } = await supabase
        .from('post_likes').select('post_id')
        .eq('post_id', id).eq('user_id', user.id).maybeSingle();
      is_liked = !!like;
    }
    setPost({ ...postData, profile, is_liked, images: postData.images ?? [] });
  };

  const fetchComments = async () => {
    const res  = await fetch(`/api/posts/${id}/comments`);
    const data = await res.json();
    setComments(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (!id) return;
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
    Promise.all([fetchPost(), fetchComments()]).then(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleLike = async () => {
    if (!post) return;
    await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
    setPost(prev => prev ? { ...prev, is_liked: !prev.is_liked, likes_count: prev.is_liked ? prev.likes_count - 1 : prev.likes_count + 1 } : prev);
  };

  const handleComment = async () => {
    if (!input.trim() || posting) return;
    setPosting(true);
    const res  = await fetch(`/api/posts/${id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments(prev => [...prev, data]);
      setPost(prev => prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev);
      setInput('');
    }
    setPosting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제할까요?')) return;
    const res = await fetch(`/api/posts/${id}/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      setPost(prev => prev ? { ...prev, comments_count: Math.max(0, prev.comments_count - 1) } : prev);
      setMenuOpen(null);
    }
  };

  const handleStartEdit = (comment: PostComment) => {
    setEditingId(comment.id);
    setEditText(comment.content);
    setMenuOpen(null);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim() || editSaving) return;
    setEditSaving(true);
    const res = await fetch(`/api/posts/${id}/comments/${commentId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editText.trim() }),
    });
    if (res.ok) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editText.trim() } : c));
      setEditingId(null);
      setEditText('');
    }
    setEditSaving(false);
  };

  if (loading) return (
    <SidebarLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontFamily: 'sans-serif' }}>불러오는 중...</div>
    </SidebarLayout>
  );

  if (!post) return (
    <SidebarLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#e2e8f0', fontFamily: 'sans-serif', gap: '16px' }}>
        <p style={{ margin: 0, fontSize: '2rem' }}>📭</p>
        <p style={{ margin: 0, color: '#64748b' }}>게시글을 찾을 수 없어요.</p>
        <Link href="/feed" style={{ color: '#7c3aed', textDecoration: 'none', fontSize: '0.875rem' }}>피드로 돌아가기</Link>
      </div>
    </SidebarLayout>
  );

  return (
    <SidebarLayout>
      {menuOpen && <div onClick={() => setMenuOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}

      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        {/* 헤더 */}
        <div style={{ borderBottom: '1px solid #1e1b3a', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: '#080810', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
          <Link href="/feed" style={{ color: '#a78bfa', fontSize: '1.2rem', textDecoration: 'none', lineHeight: 1 }}>←</Link>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0' }}>게시글</h1>
        </div>

        {/* 스크롤 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* 작성자 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {post.profile?.username ? (
              <Link href={`/profile/${post.profile.username}`}>
                <Avatar url={post.profile.avatar_url} name={post.profile.display_name} size={44} />
              </Link>
            ) : <Avatar name="?" size={44} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              {post.profile?.username ? (
                <Link href={`/profile/${post.profile.username}`} style={{ textDecoration: 'none' }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.95rem', color: '#e2e8f0' }}>{post.profile.display_name}</p>
                </Link>
              ) : <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.95rem', color: '#e2e8f0' }}>알 수 없음</p>}
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569' }}>
                {post.profile?.username ? `@${post.profile.username} · ` : ''}{timeAgo(post.created_at)}
              </p>
            </div>
          </div>

          {/* 본문 */}
          {post.content && (
            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#e2e8f0', whiteSpace: 'pre-wrap', margin: '0 0 16px' }}>
              {post.content}
            </p>
          )}

          {/* 이미지 */}
          <PostImages images={(post as any).images} />

          {/* 좋아요 */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '14px 0', borderTop: '1px solid #1e1b3a', borderBottom: '1px solid #1e1b3a', marginBottom: '20px' }}>
            <button onClick={handleLike} style={{
              background: post.is_liked ? '#ef444420' : 'transparent',
              border: post.is_liked ? '1px solid #ef4444' : '1px solid #2d2b4a',
              borderRadius: '20px', padding: '7px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              color: post.is_liked ? '#ef4444' : '#64748b', fontSize: '0.875rem', transition: 'all 0.15s',
            }}>
              {post.is_liked ? '❤️' : '🤍'} {post.likes_count}
            </button>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>💬 {post.comments_count}</span>
          </div>

          {/* 댓글 헤더 */}
          <p style={{ margin: '0 0 16px', fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>
            댓글 {comments.length}개
          </p>

          {/* 댓글 목록 */}
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#334155' }}>
              <p style={{ fontSize: '1.5rem', margin: '0 0 8px' }}>💬</p>
              <p style={{ fontSize: '0.875rem' }}>첫 번째 댓글을 남겨보세요!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {comments.map(c => {
                const isMe      = c.user_id === myId;
                const isEditing = editingId === c.id;

                return (
                  <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #1e1b3a', position: 'relative', transition: 'background 0.1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0a0a16'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {c.profile?.username ? (
                      <Link href={`/profile/${c.profile.username}`}>
                        <Avatar url={c.profile?.avatar_url} name={c.profile?.display_name} size={34} />
                      </Link>
                    ) : <Avatar name="?" size={34} />}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>{c.profile?.display_name ?? '알 수 없음'}</span>
                        {isMe && <span style={{ fontSize: '0.68rem', color: '#7c3aed', background: '#7c3aed22', padding: '1px 6px', borderRadius: '8px', fontWeight: 600 }}>나</span>}
                        <span style={{ fontSize: '0.72rem', color: '#475569' }}>{timeAgo(c.created_at)}</span>
                      </div>

                      {isEditing ? (
                        <div>
                          <input
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(c.id); if (e.key === 'Escape') { setEditingId(null); setEditText(''); } }}
                            autoFocus
                            style={{ width: '100%', background: '#0f0f1f', border: '1px solid #7c3aed', borderRadius: '8px', padding: '8px 12px', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif', marginBottom: '6px' }}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => handleSaveEdit(c.id)} disabled={editSaving || !editText.trim()} style={{ padding: '4px 12px', borderRadius: '12px', border: 'none', background: editText.trim() && !editSaving ? '#7c3aed' : '#1e1b3a', color: editText.trim() && !editSaving ? '#fff' : '#475569', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                              {editSaving ? '저장 중...' : '저장'}
                            </button>
                            <button onClick={() => { setEditingId(null); setEditText(''); }} style={{ padding: '4px 12px', borderRadius: '12px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer' }}>
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.65, wordBreak: 'break-word' }}>
                          {c.content}
                        </p>
                      )}
                    </div>

                    {/* 본인 댓글 ··· 메뉴 */}
                    {isMe && !isEditing && (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                          onClick={() => setMenuOpen(prev => prev === c.id ? null : c.id)}
                          style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.9rem', padding: '2px 6px', borderRadius: '6px' }}
                        >
                          ···
                        </button>
                        {menuOpen === c.id && (
                          <div style={{ position: 'absolute', right: 0, top: '24px', background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '12px', padding: '6px', zIndex: 50, minWidth: '120px', boxShadow: '0 8px 24px #0008' }}>
                            <button
                              onClick={() => handleStartEdit(c)}
                              style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#a78bfa', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                              ✏️ 수정
                            </button>
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                              🗑️ 삭제
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 댓글 입력창 */}
        <div style={{ borderTop: '1px solid #1e1b3a', background: '#080810', padding: '12px 20px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              placeholder="댓글을 남겨보세요..."
              style={{ flex: 1, background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '24px', padding: '10px 18px', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none', fontFamily: 'sans-serif', transition: 'border-color 0.15s' }}
              onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={e   => { e.target.style.borderColor = '#1e1b3a'; }}
            />
            <button
              onClick={handleComment}
              disabled={!input.trim() || posting}
              style={{ background: input.trim() && !posting ? '#7c3aed' : '#1e1b3a', border: 'none', borderRadius: '20px', padding: '10px 20px', color: input.trim() && !posting ? '#fff' : '#475569', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0, cursor: input.trim() && !posting ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
            >
              {posting ? '...' : '게시'}
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}