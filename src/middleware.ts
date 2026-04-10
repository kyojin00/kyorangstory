// src/middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = req.nextUrl;

  // 로그인 상태에서 루트(/) 또는 /login 접근 시 → 피드로
  if ((pathname === '/' || pathname === '/login') && user) {
    return NextResponse.redirect(new URL('/feed', req.url));
  }

  // 비로그인 상태에서 보호된 경로 접근 시 → 루트(/)로
  const protectedPaths = [
    '/feed',
    '/story/write',
    '/story/my',
    '/profile',
    '/messages',
    '/notifications',
    '/search',
    '/diary',
    '/ai-chat',
    '/kakao-analysis',
    '/trending',
    '/settings',
    '/penpal',
    '/comfort',
    '/emotion-type',
  ];

  const isProtected = protectedPaths.some(p => pathname.startsWith(p));
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/feed/:path*',
    '/story/write',
    '/story/my',
    '/profile/:path*',
    '/messages/:path*',
    '/notifications',
    '/search',
    '/diary/:path*',
    '/ai-chat/:path*',
    '/kakao-analysis/:path*',
    '/trending',
    '/settings/:path*',
    '/penpal',
    '/comfort',
    '/emotion-type',
  ],
};