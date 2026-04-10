'use client';
import { useState } from 'react';

interface Props { targetType: 'story' | 'post' | 'comment' | 'user'; targetId: string; onClose: () => void; }
const REASONS = ['스팸', '욕설/혐오', '음란물', '개인정보 노출', '사기', '기타'];

export default function ReportModal({ targetType, targetId, onClose }: Props) {
  const [reason,     setReason]     = useState('');
  const [detail,     setDetail]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true); setError('');
    const res  = await fetch('/api/report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, detail }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? '오류가 발생했어요'); setSubmitting(false); return; }
    setDone(true);
    setTimeout(onClose, 1800);
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0c0c1e', border: '1px solid #1a1830', borderRadius: '24px', padding: '28px', width: '360px', maxWidth: '90vw', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
      >
        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.5rem' }}>✅</div>
            <p style={{ margin: '0 0 6px', fontWeight: 800, color: '#4ade80', fontSize: '1rem' }}>신고가 접수됐어요</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#2d3748' }}>검토 후 조치하겠습니다</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 3px', fontSize: '1rem', fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>신고하기</h2>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#2d2b50' }}>신고 이유를 선택해주세요</p>
              </div>
              <button
                onClick={onClose}
                style={{ background: '#12112a', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '0.85rem', padding: '7px 9px', borderRadius: '10px', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1b3a'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#12112a'; }}
              >✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
              {REASONS.map(r => {
                const active = reason === r;
                return (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    style={{
                      padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                      textAlign: 'left', fontSize: '0.86rem', fontFamily: 'inherit',
                      background: active ? 'rgba(124,58,237,0.14)' : '#0e0e1f',
                      border: active ? '1.5px solid #7c3aed55' : '1.5px solid #12112a',
                      color: active ? '#c4b5fd' : '#4a5568',
                      fontWeight: active ? 700 : 400,
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = '#2d2b50'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = '#12112a'; }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: active ? '2px solid #7c3aed' : '2px solid #2d2b50', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', display: 'block' }} />}
                    </span>
                    {r}
                  </button>
                );
              })}
            </div>

            {reason === '기타' && (
              <textarea
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder="자세한 내용 (선택)"
                rows={3} maxLength={200}
                style={{
                  width: '100%', background: '#08081a', border: '1.5px solid #1a1830',
                  borderRadius: '12px', padding: '12px 14px', color: '#e2e8f0',
                  fontSize: '0.86rem', outline: 'none', resize: 'none',
                  boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '12px',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e  => { e.target.style.borderColor = '#7c3aed'; }}
                onBlur={e   => { e.target.style.borderColor = '#1a1830'; }}
              />
            )}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', padding: '9px 12px', marginBottom: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#f87171' }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              style={{
                width: '100%', padding: '13px', borderRadius: '14px', border: 'none', fontFamily: 'inherit',
                background: reason && !submitting ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : '#0e0e1f',
                color: reason && !submitting ? '#fff' : '#2d2b50',
                fontSize: '0.9rem', fontWeight: 700,
                cursor: reason && !submitting ? 'pointer' : 'not-allowed',
                boxShadow: reason && !submitting ? '0 4px 16px rgba(239,68,68,0.25)' : 'none',
                transition: 'all 0.15s',
              }}
            >{submitting ? '제출 중...' : '신고 제출'}</button>
          </>
        )}
      </div>
    </div>
  );
}