// src/types/profile.ts

export interface Profile {
  id:              string;
  username:        string;
  display_name:    string;
  bio:             string;
  avatar_url:      string;
  followers_count: number;
  following_count: number;
  posts_count:     number;
  created_at:      string;
  is_following?:   boolean; // 현재 유저가 팔로우 중인지
}

export interface Post {
  id:             string;
  user_id:        string;
  content:        string;
  likes_count:    number;
  comments_count: number;
  created_at:     string;
  profile?:       Profile;   // join
  is_liked?:      boolean;   // 현재 유저 좋아요 여부
}

export interface PostComment {
  id:         string;
  post_id:    string;
  user_id:    string;
  content:    string;
  created_at: string;
  profile?:   Profile;
}