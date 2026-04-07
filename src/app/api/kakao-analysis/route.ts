// src/app/api/kakao-analysis/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const body = await req.json();
  const { image_base64, image_type, text_content, analysis_type } = body;
  // analysis_type: 'relationship' | 'emotion' | 'advice' | 'summary'

  if (!image_base64 && !text_content) {
    return NextResponse.json({ error: '이미지 또는 텍스트를 제공해주세요' }, { status: 400 });
  }

  const typePrompts: Record<string, string> = {
    relationship: '이 대화에서 두 사람의 관계를 분석해줘. 친밀도, 감정 온도, 관심도를 파악하고 상대방이 나를 어떻게 생각하는지 솔직하게 말해줘.',
    emotion:      '이 대화에서 상대방의 감정 상태를 분석해줘. 기분, 태도, 숨겨진 감정을 읽어줘.',
    advice:       '이 대화 흐름을 보고 다음에 어떻게 대화를 이어가면 좋을지 구체적인 답장 예시 3개를 줘.',
    summary:      '이 카카오톡 대화를 요약하고 핵심 내용과 중요한 포인트를 정리해줘.',
  };

  const selectedPrompt = typePrompts[analysis_type] ?? typePrompts.relationship;

  const systemPrompt = `너는 카카오톡 대화를 분석하는 전문가야.
한국어로 답해줘. 친근하고 솔직하게 분석해줘.
이모지를 적절히 사용하고 항목별로 정리해서 읽기 쉽게 답해줘.
분석은 3~5개 항목으로 구성하고 각 항목은 2~3문장으로 설명해줘.`;

  const userContent: any[] = [];

  if (image_base64) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${image_type ?? 'image/jpeg'};base64,${image_base64}`,
        detail: 'high',
      },
    });
  }

  if (text_content) {
    userContent.push({ type: 'text', text: `카카오톡 대화 내용:\n${text_content}` });
  }

  userContent.push({ type: 'text', text: selectedPrompt });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const result = response.choices[0].message.content ?? '분석에 실패했어요.';
  return NextResponse.json({ result, analysis_type });
}