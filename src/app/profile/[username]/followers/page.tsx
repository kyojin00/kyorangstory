'use client';

// src/app/profile/[username]/followers/page.tsx

import FollowListPage from '@/components/FollowListPage';

export default function FollowersPage() {
  return <FollowListPage type="followers" />;
}