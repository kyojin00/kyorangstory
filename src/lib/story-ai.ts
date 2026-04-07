// lib/story-ai.ts
// 경로: lib/story-ai.ts  또는  src/lib/story-ai.ts

import OpenAI from 'openai';
import { EmotionTag } from '@/types/story.types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_EMOTIONS: EmotionTag[] = [
  '우울', '불안', '외로움', '분노',
  '기쁨', '설렘', '스트레스', '허무함',
];

const FALLBACK_RESPONSE = '오늘도 수고했어. 네 감정은 충분히 소중해. 잘 털어놨어 💜';

export async function analyzeEmotionAndComfort(content: string): Promise<{
  emotions:   EmotionTag[];
  aiResponse: string;
}> {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `너는 "교랑 스토리"의 감정 상담 AI야.

사용자의 글을 읽고 아래 JSON 형식만 출력해 (다른 텍스트 없음):
{
  "emotions": ["감정1", "감정2"],
  "response": "위로 메시지"
}

규칙:
- emotions: 아래 목록 중 최대 2개만 선택
  (우울, 불안, 외로움, 분노, 기쁨, 설렘, 스트레스, 허무함)
- response: 판단 없이 공감 중심, 친구처럼 짧고 따뜻하게 (2~3문장)
- 훈계, 해결책 제시 금지
- 반드시 JSON만 출력`,
        },
        { role: 'user', content },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.7,
    });

    const raw    = res.choices[0].message.content || '{}';
    const parsed = JSON.parse(raw) as { emotions?: string[]; response?: string };

    const emotions = ((parsed.emotions ?? []) as string[])
      .filter(e => VALID_EMOTIONS.includes(e as EmotionTag))
      .slice(0, 2) as EmotionTag[];

    return {
      emotions,
      aiResponse: parsed.response?.trim() || FALLBACK_RESPONSE,
    };
  } catch (err) {
    console.error('[story-ai] analyzeEmotionAndComfort error:', err);
    return { emotions: [], aiResponse: FALLBACK_RESPONSE };
  }
}