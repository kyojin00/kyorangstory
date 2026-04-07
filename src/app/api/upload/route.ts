// src/app/api/upload/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const bucket = (formData.get('bucket') as string) ?? 'post-images'; // post-images | story-images

  if (!file) return NextResponse.json({ error: '파일이 없어요' }, { status: 400 });

  // 파일 검증
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'JPG, PNG, GIF, WEBP만 가능해요' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: '5MB 이하 파일만 가능해요' }, { status: 400 });
  }

  const ext      = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return NextResponse.json({ url: publicUrl });
}