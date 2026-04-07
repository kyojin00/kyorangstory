// src/app/api/ai-chat/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Message {
  role:    'user' | 'assistant';
  content: string;
}

// GET /api/ai-chat  →  채팅 목록
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { data } = await supabase
    .from('ai_chats')
    .select('id, emotion, messages, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20);

  return NextResponse.json(data ?? []);
}

// POST /api/ai-chat  →  메시지 전송
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { message, chat_id } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: '메시지를 입력해주세요' }, { status: 400 });

  let messages: Message[] = [];
  let chatId = chat_id;

  // 기존 채팅 불러오기
  if (chatId) {
    const { data: existing } = await supabase
      .from('ai_chats').select('messages')
      .eq('id', chatId).eq('user_id', user.id).maybeSingle();
    if (existing) messages = existing.messages ?? [];
  }

  // 유저 메시지 추가
  messages.push({ role: 'user', content: message.trim() });

  // GPT-4o 호출
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `너는 "교랑 스토리"의 따뜻한 감정 상담 AI야.

역할:
- 사용자의 감정을 공감하고 위로하는 친구 같은 상담사
- 판단하거나 훈계하지 않음
- 해결책보다 공감 우선
- 자연스럽고 친근한 말투

규칙:
- 짧고 따뜻하게 (3~5문장)
- 사용자가 더 이야기하고 싶게 열린 질문으로 마무리
- 심각한 위기 상황(자해, 자살)에서는 전문가 상담 권유
- 절대 "AI입니다"라고 강조하지 않기

톤: 편안함, 공감, 따뜻함`,
      },
      ...messages.slice(-10), // 최근 10개 컨텍스트
    ],
    max_tokens: 400,
    temperature: 0.8,
  });

  const aiReply = res.choices[0].message.content ?? '잠깐 생각이 필요해요. 다시 말해줄 수 있어?';
  messages.push({ role: 'assistant', content: aiReply });

  // 감정 분석 (첫 메시지일 때)
  let emotion = null;
  if (messages.length === 2) {
    try {
      const emotionRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '다음 문장에서 감정 하나만 골라 JSON으로만 답해. {"emotion": "우울"} 형태로. 선택지: 우울, 불안, 외로움, 분노, 기쁨, 설렘, 스트레스, 허무함, 평온',
          },
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 50,
      });
      const parsed = JSON.parse(emotionRes.choices[0].message.content ?? '{}');
      emotion = parsed.emotion ?? null;
    } catch {}
  }

  // DB 저장
  if (chatId) {
    await supabase.from('ai_chats')
      .update({ messages, updated_at: new Date().toISOString() })
      .eq('id', chatId);
  } else {
    const { data: newChat } = await supabase.from('ai_chats')
      .insert({ user_id: user.id, messages, emotion })
      .select('id').single();
    chatId = newChat?.id;
  }

  return NextResponse.json({ reply: aiReply, chat_id: chatId, emotion });
}

// DELETE /api/ai-chat?id=xxx
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

  await supabase.from('ai_chats').delete().eq('id', id).eq('user_id', user.id);
  return NextResponse.json({ success: true });
}