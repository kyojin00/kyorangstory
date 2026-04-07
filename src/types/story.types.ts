// src/types/story.ts

export type EmotionTag =
  | '우울'
  | '불안'
  | '외로움'
  | '분노'
  | '기쁨'
  | '설렘'
  | '스트레스'
  | '허무함'
  | '평온'
  | '감사';

export const EMOTION_LIST: EmotionTag[] = [
  '우울', '불안', '외로움', '분노', '기쁨',
  '설렘', '스트레스', '허무함', '평온', '감사',
];

export const EMOTION_COLOR: Record<EmotionTag, string> = {
  우울:     '#6366f1',
  불안:     '#f59e0b',
  외로움:   '#8b5cf6',
  분노:     '#ef4444',
  기쁨:     '#22c55e',
  설렘:     '#ec4899',
  스트레스: '#f97316',
  허무함:   '#64748b',
  평온:     '#06b6d4',
  감사:     '#f59e0b',
};

export type ReactionType = 'heart' | 'hug' | 'cry' | 'cheer' | 'same';

export const REACTION_ICON: Record<ReactionType, string> = {
  heart: '❤️',
  hug:   '🤗',
  cry:   '🥺',
  cheer: '👏',
  same:  '🙋',
};

export const REACTION_LABEL: Record<ReactionType, string> = {
  heart: '공감해요',
  hug:   '안아줄게요',
  cry:   '울컥해요',
  cheer: '응원해요',
  same:  '나도 그래요',
};

export interface Story {
  id:             string;
  user_id:        string;
  anonymous_name: string;
  content:        string;
  emotion_tags:   EmotionTag[];
  ai_response:    string | null;
  likes_count:    number;
  comments_count: number;
  is_public:      boolean;
  created_at:     string;
  user_reaction?: ReactionType | null;
}

export interface StoryComment {
  id:             string;
  story_id:       string;
  user_id:        string;
  content:        string;
  anonymous_name: string;
  parent_id:      string | null;
  created_at:     string;
  profile?:       { username: string; display_name: string; avatar_url: string };
}