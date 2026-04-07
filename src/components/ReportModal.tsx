'use client';

// src/components/ReportModal.tsx

import { useState } from 'react';

interface Props {
  targetType: 'story' | 'post' | 'comment' | 'user';
  targetId:   string;
  onClose:    () => void;
}

const REASONS = ['스팸', '욕설/혐오', '음란물', '개인정보 노출', '사기', '기타'];

export default function ReportModal({ targetType, targetId, onClose }: Props) {
  const [reason,     setReason]     = useState('');
  const [detail,     setDetail]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError('');

    const res  = await fetch('/api/report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, detail }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error ?? '오류가 발생했어요'); setSubmitting(false); return; }
    setDone(true);
    setTimeout(onClose, 1500);
  };

  return (
    <>
      {/* 오버레이 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: '#00000088',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#0f0f1f', border: '1px solid #1e1b3a',
            borderRadius: '20px', padding: '24px', width: '380px',
            maxWidth: '90vw', boxShadow: '0 24px 60px #000a',
          }}
        >
          {done ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ fontSize: '2rem', margin: '0 0 12px' }}>✅</p>
              <p style={{ margin: 0, fontWeight: 700, color: '#22c55e', fontSize: '1rem' }}>신고가 접수됐어요</p>
              <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#64748b' }}>검토 후 조치하겠습니다</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#e2e8f0' }}>신고하기</h2>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>✕</button>
              </div>

              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b' }}>신고 이유를 선택해주세요</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                {REASONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    style={{
                      padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                      textAlign: 'left', fontSize: '0.875rem',
                      background: reason === r ? '#7c3aed22' : '#1e1b3a',
                      border: reason === r ? '1px solid #7c3aed' : '1px solid transparent',
                      color: reason === r ? '#a78bfa' : '#94a3b8',
                      fontWeight: reason === r ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {reason === r ? '● ' : '○ '}{r}
                  </button>
                ))}
              </div>

              {reason === '기타' && (
                <textarea
                  value={detail}
                  onChange={e => setDetail(e.target.value)}
                  placeholder="자세한 내용을 입력해주세요 (선택)"
                  rows={3}
                  maxLength={200}
                  style={{
                    width: '100%', background: '#080810', border: '1px solid #1e1b3a',
                    borderRadius: '10px', padding: '10px 12px', color: '#e2e8f0',
                    fontSize: '0.875rem', outline: 'none', resize: 'none',
                    boxSizing: 'border-box', fontFamily: 'sans-serif', marginBottom: '12px',
                  }}
                  onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
                  onBlur={e   => { e.target.style.borderColor = '#1e1b3a'; }}
                />
              )}

              {error && (
                <p style={{ fontSize: '0.82rem', color: '#ef4444', margin: '0 0 12px' }}>{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                style={{
                  width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                  background: reason && !submitting ? '#ef4444' : '#1e1b3a',
                  color: reason && !submitting ? '#fff' : '#475569',
                  fontSize: '0.9rem', fontWeight: 700,
                  cursor: reason && !submitting ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}
              >
                {submitting ? '제출 중...' : '신고 제출'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}