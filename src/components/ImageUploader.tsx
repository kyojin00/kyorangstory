'use client';

// src/components/ImageUploader.tsx

import { useRef, useState } from 'react';

interface Props {
  bucket:    'post-images' | 'story-images';
  images:    string[];
  onChange:  (urls: string[]) => void;
  maxCount?: number;
}

export default function ImageUploader({ bucket, images, onChange, maxCount = 4 }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = maxCount - images.length;
    const toUpload  = files.slice(0, remaining);
    if (!toUpload.length) return;

    setUploading(true);
    const urls: string[] = [];

    for (const file of toUpload) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', bucket);

      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) urls.push(data.url);
    }

    onChange([...images, ...urls]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRemove = (url: string) => {
    onChange(images.filter(u => u !== url));
  };

  return (
    <div>
      {/* 업로드된 이미지 미리보기 */}
      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(2, 1fr)',
          gap: '6px', marginBottom: '10px',
        }}>
          {images.map(url => (
            <div key={url} style={{ position: 'relative', aspectRatio: images.length === 1 ? '16/9' : '1' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
              <button
                onClick={() => handleRemove(url)}
                style={{
                  position: 'absolute', top: '6px', right: '6px',
                  background: '#000a', border: 'none', borderRadius: '50%',
                  width: '22px', height: '22px', color: '#fff',
                  cursor: 'pointer', fontSize: '0.75rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 업로드 버튼 */}
      {images.length < maxCount && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              background: 'transparent', border: '1px solid #1e1b3a',
              borderRadius: '8px', padding: '6px 12px',
              color: '#64748b', fontSize: '0.82rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1b3a'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
          >
            {uploading ? (
              <>⏳ 업로드 중...</>
            ) : (
              <>🖼️ 사진 추가 {images.length > 0 ? `(${images.length}/${maxCount})` : ''}</>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </>
      )}
    </div>
  );
}