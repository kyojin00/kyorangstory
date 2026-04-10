// src/lib/profileCache.ts
// 클라이언트 사이드 프로필 캐시 — 모든 페이지/컴포넌트 공유

interface CachedProfile {
  id?:          string;
  username:     string;
  display_name: string;
  avatar_url:   string;
  [key: string]: unknown;
}

let _cache:   CachedProfile | null = null;
let _promise: Promise<CachedProfile | null> | null = null;

export async function getProfileCached(): Promise<CachedProfile | null> {
  // 이미 캐시됨
  if (_cache) return _cache;

  // 진행 중인 요청 공유 (StrictMode 중복 방지)
  if (!_promise) {
    _promise = fetch('/api/profile')
      .then(r => r.json())
      .then((data: CachedProfile) => {
        if (data?.username) _cache = data;
        _promise = null;
        return _cache;
      })
      .catch(() => { _promise = null; return null; });
  }

  return _promise;
}

export function clearProfileCache() {
  _cache   = null;
  _promise = null;
}

export function getProfileSync(): CachedProfile | null {
  return _cache;
}