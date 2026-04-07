'use client';

// src/app/profile/[username]/following/page.tsx

import FollowListPage from '@/components/FollowListPage';

export default function FollowingPage() {
  return <FollowListPage type="following" />;
}