'use client';

// src/app/story/[id]/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Story, StoryComment, EMOTION_COLOR, REACTION_ICON, ReactionType } from '@/types/story.types';
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

export default function StoryDetailPage() {
  const params   = useParams<{ id: string }>();
  const id       = params?.id ?? '';
  const router   = useRouter();
  const supabase = createClient();

  const [story,      setStory]      = useState<Story | null>(null);
  const [comments,   setComments]   = useState<StoryComment[]>([]);
  const [myId,       setMyId]       = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);

  // 댓글 입력
  const [input,      setInput]      = useState('');
  const [replyTo,    setReplyTo]    = useState<{ id: string; name: string } | null>(null);
  const [posting,    setPosting]    = useState(false);

  // 댓글 수정/삭제
  const [menuOpen,   setMenuOpen]   = useState<string | null>(null);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editText,   setEditText]   = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // 스토리 수정
  const [storyMenu,  setStoryMenu]  = useState(false);
  const [editStory,  setEditStory]  = useState(false);
  const [storyText,  setStoryText]  = useState('');
  const [storySaving, setStorySaving] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);

      const { data: s } = await supabase.from('stories').select('*').eq('id', id).maybeSingle();
      setStory(s);

      const res  = await fetch(`/api/stories/${id}/comments`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleReaction = async (type: ReactionType) => {
    await fetch(`/api/stories/${id}/reactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction_type: type }),
    });
    const { data: s } = await supabase.from('stories').select('*').eq('id', id).maybeSingle();
    if (s) setStory(s);
  };

  const handleComment = async () => {
    if (!input.trim() || posting) return;
    setPosting(true);
    const res  = await fetch(`/api/stories/${id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.trim(), parent_id: replyTo?.id ?? null }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments(prev => [...prev, data]);
      setStory(prev => prev ? { ...prev, comments_count: (prev.comments_count ?? 0) + 1 } : prev);
      setInput(''); setReplyTo(null);
    }
    setPosting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제할까요?')) return;
    const res = await fetch(`/api/stories/${id}/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
      setStory(prev => prev ? { ...prev, comments_count: Math.max(0, (prev.comments_count ?? 0) - 1) } : prev);
      setMenuOpen(null);
    }
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editText.trim() || editSaving) return;
    setEditSaving(true);
    const res = await fetch(`/api/stories/${id}/comments/${commentId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editText.trim() }),
    });
    if (res.ok) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editText.trim() } : c));
      setEditingId(null); setEditText('');
    }
    setEditSaving(false);
  };

  const handleDeleteStory = async () => {
    if (!confirm('스토리를 삭제할까요?')) return;
    const res = await fetch(`/api/stories/${id}`, { method: 'DELETE' });
    if (res.ok) router.replace('/story');
  };

  const handleSaveStory = async () => {
    if (!storyText.trim() || storySaving) return;
    setStorySaving(true);
    const res = await fetch(`/api/stories/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: storyText.trim() }),
    });
    if (res.ok) {
      setStory(prev => prev ? { ...prev, content: storyText.trim() } : prev);
      setEditStory(false);
    }
    setStorySaving(false);
  };

  // 댓글 트리: 부모 댓글 + 대댓글
  const rootComments  = comments.filter(c => !c.parent_id);
  const getReplies    = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  if (loading) return (
    <SidebarLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontFamily: 'sans-serif' }}>불러오는 중...</div>
    </SidebarLayout>
  );

  if (!story) return (
    <SidebarLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#e2e8f0', fontFamily: 'sans-serif', gap: '16px' }}>
        <p style={{ fontSize: '2rem', margin: 0 }}>🌙</p>
        <p style={{ margin: 0, color: '#64748b' }}>스토리를 찾을 수 없어요.</p>
        <Link href="/story" style={{ color: '#7c3aed', textDecoration: 'none', fontSize: '0.875rem' }}>스토리로 돌아가기</Link>
      </div>
    </SidebarLayout>
  );

  const isMyStory = story.user_id === myId;

  return (
    <SidebarLayout>
      {(menuOpen || storyMenu) && <div onClick={() => { setMenuOpen(null); setStoryMenu(false); }} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}

      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0' }}>

        {/* 헤더 */}
        <div style={{ borderBottom: '1px solid #1e1b3a', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: '#080810', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
          <Link href="/story" style={{ color: '#a78bfa', fontSize: '1.2rem', textDecoration: 'none', lineHeight: 1 }}>←</Link>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0', flex: 1 }}>스토리</h1>
          {isMyStory && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setStoryMenu(p => !p)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px', borderRadius: '8px' }}>···</button>
              {storyMenu && (
                <div style={{ position: 'absolute', right: 0, top: '32px', background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '12px', padding: '6px', zIndex: 50, minWidth: '130px', boxShadow: '0 8px 24px #0008' }}>
                  <button onClick={() => { setStoryText(story.content); setEditStory(true); setStoryMenu(false); }}
                    style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#a78bfa', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    ✏️ 수정하기
                  </button>
                  <button onClick={handleDeleteStory}
                    style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    🗑️ 삭제하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 스크롤 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* 스토리 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed33, #4c1d9533)', border: '1px solid #7c3aed44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>🌙</div>
            <div>
              <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.875rem', color: '#a78bfa' }}>{story.anonymous_name}</p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569' }}>{timeAgo(story.created_at)}</p>
            </div>
          </div>

          {/* 감정 태그 */}
          {story.emotion_tags?.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {story.emotion_tags.map((tag: string) => (
                <span key={tag} style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '20px', background: (EMOTION_COLOR as any)[tag] + '22', color: (EMOTION_COLOR as any)[tag], border: `1px solid ${(EMOTION_COLOR as any)[tag]}44` }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 본문 또는 수정 입력 */}
          {editStory ? (
            <div style={{ marginBottom: '16px' }}>
              <textarea
                value={storyText}
                onChange={e => setStoryText(e.target.value)}
                rows={6}
                autoFocus
                maxLength={2000}
                style={{ width: '100%', background: '#0f0f1f', border: '1px solid #7c3aed', borderRadius: '12px', padding: '12px 14px', color: '#e2e8f0', fontSize: '0.95rem', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif', lineHeight: 1.7 }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => { setEditStory(false); setStoryText(''); }} style={{ padding: '7px 16px', borderRadius: '20px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer' }}>취소</button>
                <button onClick={handleSaveStory} disabled={storySaving || !storyText.trim()} style={{ padding: '7px 16px', borderRadius: '20px', border: 'none', background: storyText.trim() && !storySaving ? '#7c3aed' : '#1e1b3a', color: storyText.trim() && !storySaving ? '#fff' : '#475569', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                  {storySaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '1rem', lineHeight: 1.85, color: '#e2e8f0', whiteSpace: 'pre-wrap', margin: '0 0 20px' }}>
              {story.content}
            </p>
          )}

          {/* 반응 */}
          <div style={{ display: 'flex', gap: '8px', paddingBottom: '20px', borderBottom: '1px solid #1e1b3a', marginBottom: '20px', flexWrap: 'wrap' }}>
            {(['heart', 'hug', 'cry', 'cheer', 'same'] as ReactionType[]).map(type => (
              <button key={type} onClick={() => handleReaction(type)} style={{
                background: 'transparent', border: '1px solid #2d2b4a',
                borderRadius: '20px', padding: '6px 14px', cursor: 'pointer',
                fontSize: '0.875rem', color: '#94a3b8', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2d2b4a'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
              >
                {REACTION_ICON[type]}
              </button>
            ))}
          </div>

          {/* 댓글 헤더 */}
          <p style={{ margin: '0 0 16px', fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>
            댓글 {comments.length}개
          </p>

          {/* 댓글 목록 */}
          {rootComments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#334155' }}>
              <p style={{ fontSize: '1.5rem', margin: '0 0 8px' }}>💬</p>
              <p style={{ fontSize: '0.875rem' }}>첫 번째 댓글을 남겨보세요!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rootComments.map(comment => {
                const replies   = getReplies(comment.id);
                const isMe      = comment.user_id === myId;
                const isEditing = editingId === comment.id;

                return (
                  <div key={comment.id}>
                    {/* 루트 댓글 */}
                    <div style={{ display: 'flex', gap: '10px', padding: '12px 0', borderBottom: replies.length === 0 ? '1px solid #1e1b3a' : 'none', position: 'relative' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed22, #4c1d9522)', border: '1px solid #7c3aed33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>🌙</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a78bfa' }}>{comment.anonymous_name ?? '익명'}</span>
                          {isMe && <span style={{ fontSize: '0.68rem', color: '#7c3aed', background: '#7c3aed22', padding: '1px 6px', borderRadius: '8px' }}>나</span>}
                          <span style={{ fontSize: '0.72rem', color: '#475569' }}>{timeAgo(comment.created_at)}</span>
                        </div>
                        {isEditing ? (
                          <div>
                            <input value={editText} onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveCommentEdit(comment.id); if (e.key === 'Escape') { setEditingId(null); setEditText(''); } }}
                              autoFocus
                              style={{ width: '100%', background: '#0f0f1f', border: '1px solid #7c3aed', borderRadius: '8px', padding: '8px 12px', color: '#e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif', marginBottom: '6px' }}
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => handleSaveCommentEdit(comment.id)} disabled={editSaving} style={{ padding: '4px 12px', borderRadius: '12px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>저장</button>
                              <button onClick={() => { setEditingId(null); setEditText(''); }} style={{ padding: '4px 12px', borderRadius: '12px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer' }}>취소</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.65, wordBreak: 'break-word' }}>{comment.content}</p>
                            <button onClick={() => { setReplyTo({ id: comment.id, name: comment.anonymous_name ?? '익명' }); inputRef.current?.focus(); }}
                              style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: '0.75rem', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}>
                              ↩️ 답글
                            </button>
                          </>
                        )}
                      </div>
                      {isMe && !isEditing && (
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <button onClick={() => setMenuOpen(p => p === comment.id ? null : comment.id)} style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 6px' }}>···</button>
                          {menuOpen === comment.id && (
                            <div style={{ position: 'absolute', right: 0, top: '24px', background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '12px', padding: '6px', zIndex: 50, minWidth: '110px', boxShadow: '0 8px 24px #0008' }}>
                              <button onClick={() => { setEditingId(comment.id); setEditText(comment.content); setMenuOpen(null); }}
                                style={{ width: '100%', padding: '7px 12px', background: 'transparent', border: 'none', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                ✏️ 수정
                              </button>
                              <button onClick={() => handleDeleteComment(comment.id)}
                                style={{ width: '100%', padding: '7px 12px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                🗑️ 삭제
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 대댓글 */}
                    {replies.map((reply, ri) => (
                      <div key={reply.id} style={{
                        display: 'flex', gap: '10px', padding: '10px 0 10px 36px',
                        borderBottom: ri === replies.length - 1 ? '1px solid #1e1b3a' : 'none',
                        borderLeft: '2px solid #7c3aed33', marginLeft: '16px', paddingLeft: '20px',
                        position: 'relative',
                      }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#7c3aed11', border: '1px solid #7c3aed22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', flexShrink: 0 }}>🌙</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a78bfa' }}>{reply.anonymous_name ?? '익명'}</span>
                            {reply.user_id === myId && <span style={{ fontSize: '0.65rem', color: '#7c3aed', background: '#7c3aed22', padding: '1px 5px', borderRadius: '6px' }}>나</span>}
                            <span style={{ fontSize: '0.7rem', color: '#334155' }}>{timeAgo(reply.created_at)}</span>
                          </div>
                          {editingId === reply.id ? (
                            <div>
                              <input value={editText} onChange={e => setEditText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveCommentEdit(reply.id); if (e.key === 'Escape') { setEditingId(null); setEditText(''); } }}
                                autoFocus
                                style={{ width: '100%', background: '#0f0f1f', border: '1px solid #7c3aed', borderRadius: '8px', padding: '7px 10px', color: '#e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif', marginBottom: '5px' }}
                              />
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={() => handleSaveCommentEdit(reply.id)} disabled={editSaving} style={{ padding: '3px 10px', borderRadius: '10px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>저장</button>
                                <button onClick={() => { setEditingId(null); setEditText(''); }} style={{ padding: '3px 10px', borderRadius: '10px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer' }}>취소</button>
                              </div>
                            </div>
                          ) : (
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6, wordBreak: 'break-word' }}>{reply.content}</p>
                          )}
                        </div>
                        {reply.user_id === myId && editingId !== reply.id && (
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <button onClick={() => setMenuOpen(p => p === reply.id ? null : reply.id)} style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 5px' }}>···</button>
                            {menuOpen === reply.id && (
                              <div style={{ position: 'absolute', right: 0, top: '22px', background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '12px', padding: '6px', zIndex: 50, minWidth: '110px', boxShadow: '0 8px 24px #0008' }}>
                                <button onClick={() => { setEditingId(reply.id); setEditText(reply.content); setMenuOpen(null); }}
                                  style={{ width: '100%', padding: '7px 12px', background: 'transparent', border: 'none', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                  ✏️ 수정
                                </button>
                                <button onClick={() => handleDeleteComment(reply.id)}
                                  style={{ width: '100%', padding: '7px 12px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                  🗑️ 삭제
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 댓글 입력창 */}
        <div style={{ borderTop: '1px solid #1e1b3a', background: '#080810', padding: '10px 20px 14px', flexShrink: 0 }}>
          {replyTo && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#1e1b3a', borderRadius: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#a78bfa' }}>↩️ {replyTo.name}에게 답글</span>
              <button onClick={() => setReplyTo(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>✕</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              placeholder={replyTo ? `${replyTo.name}에게 답글...` : '따뜻한 댓글을 남겨보세요...'}
              rows={1}
              style={{ flex: 1, background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '18px', padding: '10px 16px', color: '#e2e8f0', fontSize: '0.875rem', outline: 'none', resize: 'none', fontFamily: 'sans-serif', maxHeight: '100px', overflowY: 'auto', transition: 'border-color 0.15s' }}
              onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={e   => { e.target.style.borderColor = '#1e1b3a'; }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 100) + 'px';
              }}
            />
            <button onClick={handleComment} disabled={!input.trim() || posting}
              style={{ background: input.trim() && !posting ? '#7c3aed' : '#1e1b3a', border: 'none', borderRadius: '18px', padding: '10px 18px', color: input.trim() && !posting ? '#fff' : '#475569', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0, cursor: input.trim() && !posting ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
              {posting ? '...' : '게시'}
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}