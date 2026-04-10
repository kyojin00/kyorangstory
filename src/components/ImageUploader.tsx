'use client';
import { useRef, useState } from 'react';

interface Props { bucket: 'post-images' | 'story-images'; images: string[]; onChange: (urls: string[]) => void; maxCount?: number; }

export default function ImageUploader({ bucket, images, onChange, maxCount = 4 }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const toUpload = files.slice(0, maxCount - images.length);
    if (!toUpload.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of toUpload) {
      const fd = new FormData();
      fd.append('file', file); fd.append('bucket', bucket);
      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) urls.push(data.url);
    }
    onChange([...images, ...urls]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(2, 1fr)',
          gap: '6px', marginBottom: '10px',
        }}>
          {images.map(url => (
            <div key={url} style={{ position: 'relative', aspectRatio: images.length === 1 ? '16/9' : '1', borderRadius: '12px', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* 오버레이 */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)'; }}
              />
              <button
                onClick={() => onChange(images.filter(u => u !== url))}
                style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%',
                  width: '24px', height: '24px', color: '#fff',
                  cursor: 'pointer', fontSize: '0.72rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {images.length < maxCount && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              background: '#08081a', border: '1.5px dashed #1a1830',
              borderRadius: '12px', padding: '10px 16px',
              color: '#3d3660', fontSize: '0.82rem', cursor: uploading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.15s', width: '100%', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!uploading) { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#7c3aed44'; el.style.color = '#7c6fa0'; } }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1a1830'; el.style.color = '#3d3660'; }}
          >
            {uploading ? (
              <><span style={{ fontSize: '0.9rem' }}>⏳</span> 업로드 중...</>
            ) : (
              <><span style={{ fontSize: '0.9rem' }}>🖼️</span> 사진 추가 {images.length > 0 ? `(${images.length}/${maxCount})` : `(최대 ${maxCount}장)`}</>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: 'none' }} />
        </>
      )}
    </div>
  );
}