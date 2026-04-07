// src/app/api/posts/[id]/comments/[commentId]/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string; commentId: string }> };

// PATCH → 댓글 수정
export async function PATCH(req: NextRequest, { params }: Params) {
  const { commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: comment } = await supabase
    .from('post_comments').select('user_id').eq('id', commentId).maybeSingle();
  if (!comment)                   return NextResponse.json({ error: '없는 댓글' }, { status: 404 });
  if (comment.user_id !== user.id) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });

  const { data, error } = await supabase
    .from('post_comments').update({ content: content.trim() }).eq('id', commentId).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE → 댓글 삭제
export async function DELETE(_: NextRequest, { params }: Params) {
  const { id: postId, commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data: comment } = await supabase
    .from('post_comments').select('user_id').eq('id', commentId).maybeSingle();
  if (!comment)                   return NextResponse.json({ error: '없는 댓글' }, { status: 404 });
  if (comment.user_id !== user.id) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  await supabase.from('post_comments').delete().eq('id', commentId);

  // 댓글 수 감소
  await supabase.rpc('decrement_comments_count', { post_id: postId });

  return NextResponse.json({ success: true });
}