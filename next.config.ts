import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 이미지 최적화
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'k.kakaocdn.net' },
    ],
    formats:         ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },

  // 번들 최적화
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },

  // HTTP 캐시 헤더
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },

  // 압축
  compress: true,
};

export default nextConfig;