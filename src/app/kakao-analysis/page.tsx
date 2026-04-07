'use client';

// src/app/kakao-analysis/page.tsx

import { useRef, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';

type AnalysisType = 'relationship' | 'emotion' | 'advice' | 'summary';

const ANALYSIS_TYPES: { key: AnalysisType; icon: string; label: string; desc: string }[] = [
  { key: 'relationship', icon: '💑', label: '관계 분석',   desc: '상대방이 나를 어떻게 생각하는지' },
  { key: 'emotion',      icon: '🎭', label: '감정 읽기',   desc: '상대방의 숨겨진 감정 파악' },
  { key: 'advice',       icon: '💬', label: '답장 추천',   desc: '다음 대화 이어가는 방법' },
  { key: 'summary',      icon: '📋', label: '대화 요약',   desc: '핵심 내용 정리' },
];

export default function KakaoAnalysisPage() {
  const [analysisType, setAnalysisType] = useState<AnalysisType>('relationship');
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textContent,  setTextContent]  = useState('');
  const [result,       setResult]       = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [inputMode,    setInputMode]    = useState<'image' | 'text'>('image');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('10MB 이하 이미지만 가능해요'); return; }
    setImageFile(file);
    setError('');
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (inputMode === 'image' && !imageFile)          { setError('이미지를 업로드해주세요'); return; }
    if (inputMode === 'text'  && !textContent.trim()) { setError('대화 내용을 입력해주세요'); return; }
    setLoading(true); setError(''); setResult('');

    let image_base64 = null;
    let image_type   = null;

    if (inputMode === 'image' && imageFile) {
      image_base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res((r.result as string).split(',')[1]);
        r.onerror = () => rej(new Error('읽기 실패'));
        r.readAsDataURL(imageFile);
      });
      image_type = imageFile.type;
    }

    const apiRes = await fetch('/api/kakao-analysis', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        image_base64,
        image_type,
        text_content:  inputMode === 'text' ? textContent : null,
        analysis_type: analysisType,
      }),
    });

    const data = await apiRes.json();
    if (!apiRes.ok) setError(data.error ?? '분석 실패');
    else setResult(data.result);
    setLoading(false);
  };

  const handleReset = () => {
    setImageFile(null); setImagePreview(null);
    setTextContent(''); setResult(''); setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '720px', margin: '0 auto', fontFamily: 'sans-serif', color: '#e2e8f0', paddingBottom: '60px' }}>

        {/* 헤더 */}
        <div style={{ borderBottom: '1px solid #1e1b3a', padding: '18px 20px', position: 'sticky', top: 0, background: '#080810', zIndex: 10 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: '#e2e8f0' }}>
            🔍 대화 분석
          </h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            카톡 대화 내용을 분석해 드립니다
          </p>
        </div>

        <div style={{ padding: '20px' }}>

          {/* 분석 유형 */}
          <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>분석 유형</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '20px' }}>
            {ANALYSIS_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setAnalysisType(t.key)}
                style={{
                  padding: '12px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background:  analysisType === t.key ? '#7c3aed22' : '#0f0f1f',
                  outline:     analysisType === t.key ? '2px solid #7c3aed' : '1px solid #1e1b3a',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{t.icon}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: analysisType === t.key ? '#a78bfa' : '#e2e8f0' }}>{t.label}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{t.desc}</p>
              </button>
            ))}
          </div>

          {/* 입력 모드 */}
          <div style={{ display: 'flex', background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '10px', padding: '3px', marginBottom: '16px' }}>
            {([{ key: 'image', label: '📸 스크린샷' }, { key: 'text', label: '📝 텍스트 붙여넣기' }] as { key: typeof inputMode; label: string }[]).map(m => (
              <button key={m.key} onClick={() => { setInputMode(m.key); setError(''); }} style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                background: inputMode === m.key ? '#7c3aed' : 'transparent',
                color:      inputMode === m.key ? '#fff' : '#64748b',
                fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* 이미지 업로드 */}
          {inputMode === 'image' && (
            <>
              {!imagePreview ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: '100%', aspectRatio: '16/7', borderRadius: '16px',
                    border: '2px dashed #1e1b3a', background: '#0f0f1f',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '12px',
                    transition: 'all 0.15s', marginBottom: '16px',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1b3a'; }}
                >
                  <span style={{ fontSize: '2.5rem' }}>📱</span>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8' }}>카카오톡 스크린샷 업로드</p>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569' }}>JPG, PNG · 최대 10MB</p>
                  </div>
                </button>
              ) : (
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="preview" style={{ width: '100%', borderRadius: '16px', maxHeight: '400px', objectFit: 'contain', background: '#0f0f1f' }} />
                  <button onClick={handleReset} style={{ position: 'absolute', top: '10px', right: '10px', background: '#000a', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
            </>
          )}

          {/* 텍스트 입력 */}
          {inputMode === 'text' && (
            <textarea
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              placeholder={`카카오톡 대화 내용을 붙여넣어주세요.\n\n예시:\n홍길동: 안녕~\n나: ㅎㅎ 안녕!\n홍길동: 오늘 뭐해?`}
              rows={8}
              style={{
                width: '100%', background: '#0f0f1f', border: '1px solid #1e1b3a',
                borderRadius: '14px', padding: '14px 16px', color: '#e2e8f0',
                fontSize: '0.9rem', outline: 'none', resize: 'vertical',
                boxSizing: 'border-box', fontFamily: 'sans-serif', lineHeight: 1.65,
                marginBottom: '16px', transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={e  => { e.target.style.borderColor = '#1e1b3a'; }}
            />
          )}

          {error && <p style={{ fontSize: '0.82rem', color: '#ef4444', margin: '0 0 12px', textAlign: 'center' }}>{error}</p>}

          {/* 분석 버튼 */}
          <button
            onClick={handleAnalyze}
            disabled={loading || (inputMode === 'image' ? !imageFile : !textContent.trim())}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
              background: loading || (inputMode === 'image' ? !imageFile : !textContent.trim())
                ? '#1e1b3a'
                : 'linear-gradient(135deg, #7c3aed, #4c1d95)',
              color: loading || (inputMode === 'image' ? !imageFile : !textContent.trim()) ? '#475569' : '#fff',
              fontSize: '1rem', fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', marginBottom: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {loading ? '분석 중이에요...' : '🔍 분석하기'}
          </button>

          {/* 결과 */}
          {result && (
            <div style={{ background: 'linear-gradient(135deg, #0f0820, #0a0a16)', border: '1px solid #7c3aed33', borderRadius: '18px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #1e1b3a' }}>
                <span style={{ fontSize: '1.2rem' }}>{ANALYSIS_TYPES.find(t => t.key === analysisType)?.icon}</span>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#a78bfa' }}>
                  {ANALYSIS_TYPES.find(t => t.key === analysisType)?.label} 결과
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {result}
              </div>
              {/* 다른 분석 유형 바로가기 */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #1e1b3a', flexWrap: 'wrap' }}>
                {ANALYSIS_TYPES.filter(t => t.key !== analysisType).map(t => (
                  <button key={t.key} onClick={() => { setAnalysisType(t.key); setResult(''); }}
                    style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #1e1b3a', background: 'transparent', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1b3a'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}