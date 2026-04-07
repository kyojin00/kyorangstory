'use client';

// src/app/admin/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

interface Report {
  id:          string;
  reporter_id: string;
  target_type: string;
  target_id:   string;
  reason:      string;
  detail:      string;
  status:      string;
  created_at:  string;
  reporter?:   { username: string; display_name: string };
}

interface Stats {
  users:    number;
  posts:    number;
  stories:  number;
  reports:  number;
  today_users: number;
  today_posts: number;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function AdminPage() {
  const [tab,      setTab]      = useState<'stats' | 'reports' | 'users'>('stats');
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [reports,  setReports]  = useState<Report[]>([]);
  const [users,    setUsers]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [handling, setHandling] = useState<string | null>(null);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }

      // 관리자 확인
      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      if (!profile?.is_admin) { router.replace('/feed'); return; }

      await loadAll();
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 통계
    const [
      { count: userCount },
      { count: postCount },
      { count: storyCount },
      { count: reportCount },
      { count: todayUsers },
      { count: todayPosts },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('stories').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    ]);

    setStats({
      users:       userCount ?? 0,
      posts:       postCount ?? 0,
      stories:     storyCount ?? 0,
      reports:     reportCount ?? 0,
      today_users: todayUsers ?? 0,
      today_posts: todayPosts ?? 0,
    });

    // 신고 목록
    const { data: rpts } = await supabase
      .from('reports').select('*').eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(50);

    if (rpts?.length) {
      const reporterIds = [...new Set(rpts.map(r => r.reporter_id))];
      const { data: rProfiles } = await supabase
        .from('profiles').select('id, username, display_name').in('id', reporterIds);
      const pMap = Object.fromEntries((rProfiles ?? []).map(p => [p.id, p]));
      setReports(rpts.map(r => ({ ...r, reporter: pMap[r.reporter_id] })));
    } else {
      setReports([]);
    }

    // 사용자 목록 (최신 가입순)
    const { data: u } = await supabase
      .from('profiles').select('id, username, display_name, avatar_url, created_at, is_banned, is_admin')
      .order('created_at', { ascending: false }).limit(50);
    setUsers(u ?? []);

    setLoading(false);
  };

  const handleReport = async (reportId: string, action: 'reviewed' | 'dismissed') => {
    setHandling(reportId);
    await supabase.from('reports').update({ status: action }).eq('id', reportId);
    setReports(prev => prev.filter(r => r.id !== reportId));
    if (stats) setStats(prev => prev ? { ...prev, reports: Math.max(0, prev.reports - 1) } : prev);
    setHandling(null);
  };

  const handleBan = async (userId: string, isBanned: boolean) => {
    if (!confirm(isBanned ? '차단을 해제할까요?' : '이 사용자를 차단할까요?')) return;
    await supabase.from('profiles').update({ is_banned: !isBanned }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !isBanned } : u));
  };

  const StatCard = ({ icon, label, value, sub }: { icon: string; label: string; value: number; sub?: string }) => (
    <div style={{ background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <p style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#e2e8f0' }}>{value.toLocaleString()}</p>
      <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>{label}</p>
      {sub && <p style={{ margin: 0, fontSize: '0.75rem', color: '#7c3aed' }}>{sub}</p>}
    </div>
  );

  return (
    <SidebarLayout>
      <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', color: '#e2e8f0', padding: '0 20px 60px' }}>

        {/* 헤더 */}
        <div style={{ borderBottom: '1px solid #1e1b3a', padding: '18px 0', position: 'sticky', top: 0, background: '#080810', zIndex: 10 }}>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#e2e8f0' }}>
            🛡️ 관리자 페이지
          </h1>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>불러오는 중...</p>
        ) : (
          <>
            {/* 탭 */}
            <div style={{ display: 'flex', gap: '4px', margin: '20px 0', background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '12px', padding: '4px' }}>
              {([
                { key: 'stats',   label: '📊 통계' },
                { key: 'reports', label: `🚨 신고 ${stats?.reports ? `(${stats.reports})` : ''}` },
                { key: 'users',   label: '👥 사용자' },
              ] as { key: typeof tab; label: string }[]).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: '9px', borderRadius: '9px', border: 'none',
                  background: tab === t.key ? '#7c3aed' : 'transparent',
                  color: tab === t.key ? '#fff' : '#64748b',
                  fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* 통계 탭 */}
            {tab === 'stats' && stats && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                  <StatCard icon="👤" label="전체 사용자" value={stats.users} sub={`오늘 +${stats.today_users}`} />
                  <StatCard icon="📝" label="전체 게시글" value={stats.posts} sub={`오늘 +${stats.today_posts}`} />
                  <StatCard icon="🌙" label="전체 스토리" value={stats.stories} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <StatCard icon="🚨" label="처리 대기 신고" value={stats.reports} />
                  <div style={{ background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>빠른 메뉴</p>
                    <Link href="/admin/reports" style={{ color: '#a78bfa', fontSize: '0.875rem', textDecoration: 'none' }}>→ 신고 처리하기</Link>
                    <button onClick={loadAll} style={{ background: 'transparent', border: '1px solid #334155', borderRadius: '8px', padding: '8px', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}>
                      🔄 새로고침
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 신고 탭 */}
            {tab === 'reports' && (
              <div>
                {reports.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#334155' }}>
                    <p style={{ fontSize: '2rem', margin: '0 0 12px' }}>✅</p>
                    <p style={{ fontSize: '0.9rem' }}>처리할 신고가 없어요</p>
                  </div>
                ) : reports.map(report => (
                  <div key={report.id} style={{ background: '#0f0f1f', border: '1px solid #1e1b3a', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', borderRadius: '8px', padding: '2px 8px', fontWeight: 700 }}>
                          {report.target_type}
                        </span>
                        <span style={{ marginLeft: '8px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
                          {report.reason}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#475569' }}>{timeAgo(report.created_at)}</span>
                    </div>

                    {report.detail && (
                      <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#64748b', background: '#080810', borderRadius: '8px', padding: '8px 12px' }}>
                        {report.detail}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                        신고자: @{report.reporter?.username ?? '알 수 없음'}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {report.target_type === 'post' && (
                          <Link href={`/feed/${report.target_id}`} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', color: '#94a3b8', fontSize: '0.78rem', textDecoration: 'none' }}>
                            글 보기
                          </Link>
                        )}
                        {report.target_type === 'story' && (
                          <Link href={`/story/${report.target_id}`} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', color: '#94a3b8', fontSize: '0.78rem', textDecoration: 'none' }}>
                            글 보기
                          </Link>
                        )}
                        <button
                          onClick={() => handleReport(report.id, 'dismissed')}
                          disabled={handling === report.id}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer' }}
                        >
                          무시
                        </button>
                        <button
                          onClick={() => handleReport(report.id, 'reviewed')}
                          disabled={handling === report.id}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {handling === report.id ? '...' : '처리 완료'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 사용자 탭 */}
            {tab === 'users' && (
              <div>
                {users.map(user => (
                  <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #1e1b3a' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {(user.display_name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: user.is_banned ? '#475569' : '#e2e8f0' }}>
                          {user.display_name ?? '(미설정)'}
                        </span>
                        {user.is_admin && <span style={{ fontSize: '0.65rem', background: '#7c3aed22', color: '#a78bfa', padding: '1px 6px', borderRadius: '8px' }}>관리자</span>}
                        {user.is_banned && <span style={{ fontSize: '0.65rem', background: '#ef444422', color: '#ef4444', padding: '1px 6px', borderRadius: '8px' }}>차단됨</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569' }}>
                        {user.username ? `@${user.username}` : '프로필 미설정'} · {timeAgo(user.created_at)} 가입
                      </p>
                    </div>
                    {!user.is_admin && (
                      <button
                        onClick={() => handleBan(user.id, user.is_banned)}
                        style={{
                          padding: '6px 14px', borderRadius: '20px', border: '1px solid #334155',
                          background: 'transparent', fontSize: '0.78rem', cursor: 'pointer',
                          color: user.is_banned ? '#22c55e' : '#ef4444', transition: 'all 0.15s',
                        }}
                      >
                        {user.is_banned ? '차단 해제' : '차단'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </SidebarLayout>
  );
}