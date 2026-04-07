'use client';

// src/components/EditPostModal.tsx

import { useState } from 'react';
import ImageUploader from '@/components/ImageUploader';

interface Props {
  postId:    string;
  content:   string;
  images?:   string[];
  onSave:    (newContent: string, newImages: string[]) => void;
  onClose:   () => void;
}

export default function EditPostModal({ postId, content, images = [], onSave, onClose }: Props) {
  const [text,      setText]      = useState(content);
  const [imgList,   setImgList]   = useState<string[]>(images);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const handleSave = async () => {
    if (!text.trim() && !imgList.length) { setError('내용 또는 이미지를 추가해주세요'); return; }
    if (saving) return;
    setSaving(true);
    setError('');

    const res  = await fetch(`/api/posts/${postId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: text.trim(), images: imgList }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error ?? '수정 실패'); setSaving(false); return; }
    onSave(text.trim(), imgList);
    onClose();
  };

  const unchanged = text.trim() === content && JSON.stringify(imgList) === JSON.stringify(images);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '520px', boxShadow: '0 24px 60px #000a' }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#e2e8f0' }}>게시글 수정</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>✕</button>
        </div>

        {/* 텍스트 */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          autoFocus
          maxLength={500}
          placeholder="내용을 입력해주세요..."
          style={{
            width: '100%', background: '#080810', border: '1px solid #1e1b3a',
            borderRadius: '12px', padding: '12px 14px', color: '#e2e8f0',
            fontSize: '0.95rem', outline: 'none', resize: 'none',
            boxSizing: 'border-box', fontFamily: 'sans-serif', lineHeight: 1.7,
            transition: 'border-color 0.15s', marginBottom: '6px',
          }}
          onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
          onBlur={e  => { e.target.style.borderColor = '#1e1b3a'; }}
        />
        <p style={{ textAlign: 'right', fontSize: '0.75rem', color: text.length > 450 ? '#f97316' : '#334155', margin: '0 0 14px' }}>
          {text.length}/500
        </p>

        {/* 이미지 업로더 */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>사진 ({imgList.length}/4)</p>
          <ImageUploader
            bucket="post-images"
            images={imgList}
            onChange={setImgList}
            maxCount={4}
          />
        </div>

        {error && <p style={{ fontSize: '0.82rem', color: '#ef4444', margin: '0 0 12px' }}>{error}</p>}

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '20px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer' }}>
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || unchanged}
            style={{
              padding: '9px 24px', borderRadius: '20px', border: 'none',
              background: saving || unchanged ? '#1e1b3a' : '#7c3aed',
              color:      saving || unchanged ? '#475569' : '#fff',
              fontSize: '0.875rem', fontWeight: 700,
              cursor: saving || unchanged ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}