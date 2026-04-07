// src/app/layout.tsx
// 기존 layout.tsx에서 metadata 부분만 교체하면 돼요

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title:       '교랑 스토리 — 익명으로 마음을 털어놓는 공간',
  description: '판단 없이 감정을 나누고 공감받는 익명 감정 공유 플랫폼. AI가 당신의 감정을 읽고 위로해드려요.',
  keywords:    ['익명 상담', '감정 공유', '익명 SNS', '교랑 스토리', '마음 털어놓기'],
  authors:     [{ name: '교랑 스토리' }],
  openGraph: {
    type:        'website',
    locale:      'ko_KR',
    url:         'https://kyorangstory.com',
    siteName:    '교랑 스토리',
    title:       '교랑 스토리 — 익명으로 마음을 털어놓는 공간',
    description: '판단 없이 감정을 나누고 공감받는 익명 감정 공유 플랫폼.',
    images: [{
      url:    '/og-image.png',
      width:  1200,
      height: 630,
      alt:    '교랑 스토리',
    }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       '교랑 스토리',
    description: '판단 없이 감정을 나누고 공감받는 익명 감정 공유 플랫폼.',
    images:      ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}