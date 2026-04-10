'use client';
import { useState } from 'react';
import ImageUploader from '@/components/ImageUploader';

interface Props {
  postId:   string; content: string; images?: string[];
  onSave:   (newContent: string, newImages: string[]) => void;
  onClose:  () => void;
}

export default function EditPostModal({ postId, content, images = [], onSave, onClose }: Props) {
  const [text,    setText]    = useState(content);
  const [imgList, setImgList] = useState<string[]>(images);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const handleSave = async () => {
    if (!text.trim() && !imgList.length) { setError('내용 또는 이미지를 추가해주세요'); return; }
    if (saving) return;
    setSaving(true); setError('');
    const res  = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim(), images: imgList }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? '수정 실패'); setSaving(false); return; }
    onSave(text.trim(), imgList);
    onClose();
  };

  const unchanged = text.trim() === content && JSON.stringify(imgList) === JSON.stringify(images);
  const canSave   = !saving && !unchanged;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0c0c1e', border: '1px solid #1a1830',
          borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '520px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>게시글 수정</h2>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#2d2b50', marginTop: '2px' }}>내용을 수정하고 저장하세요</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: '#12112a', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '0.9rem', padding: '8px 10px', borderRadius: '10px', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#12112a'; (e.currentTarget as HTMLElement).style.color = '#4a5568'; }}
          >✕</button>
        </div>

        {/* 텍스트 */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={5} autoFocus maxLength={500}
            placeholder="내용을 입력해주세요..."
            style={{
              width: '100%', background: '#08081a', border: '1.5px solid #1a1830',
              borderRadius: '14px', padding: '14px 16px', color: '#e2e8f0',
              fontSize: '0.92rem', outline: 'none', resize: 'none',
              boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.75,
              transition: 'border-color 0.15s',
            }}
            onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
            onBlur={e   => { e.target.style.borderColor = '#1a1830'; }}
          />
          <span style={{
            position: 'absolute', bottom: '10px', right: '14px',
            fontSize: '0.7rem', color: text.length > 450 ? '#f97316' : '#2d2b50',
          }}>{text.length}/500</span>
        </div>

        {/* 이미지 */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 700, color: '#3d3660', letterSpacing: '0.04em' }}>
            사진 · {imgList.length}/{4}
          </p>
          <ImageUploader bucket="post-images" images={imgList} onChange={setImgList} maxCount={4} />
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#f87171' }}>{error}</p>
          </div>
        )}

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #1a1830', background: 'transparent', color: '#4a5568', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2d2b50'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a1830'; (e.currentTarget as HTMLElement).style.color = '#4a5568'; }}
          >취소</button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '10px 28px', borderRadius: '12px', border: 'none', fontFamily: 'inherit',
              background: canSave ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#12112a',
              color: canSave ? '#fff' : '#2d2b50',
              fontSize: '0.875rem', fontWeight: 700,
              cursor: canSave ? 'pointer' : 'not-allowed',
              boxShadow: canSave ? '0 4px 16px rgba(124,58,237,0.3)' : 'none',
              transition: 'all 0.15s',
            }}
          >{saving ? '저장 중...' : '저장'}</button>
        </div>
      </div>
    </div>
  );
}