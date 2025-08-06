export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'premium';
}

export interface GlowAnalysis {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  glow_score: number;
  skin_tone: string;
  brightness: number;
  hydration: number;
  symmetry: number;
  symmetryScore: number;
  tips: string[];
}

export interface OutfitAnalysis {
  id: string;
  user_id: string;
  image_url: string;
  event_type: string;
  created_at: string;
  outfit_score: number;
  color_match_score: number;
  compatible_colors: string[];
  tips: string[];
}

export interface CoachingPlan {
  id: string;
  user_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface DailyTask {
  id: string;
  plan_id: string;
  user_id: string;
  day: number;
  date: string;
  tasks: {
    id: string;
    title: string;
    description: string;
    completed: boolean;
  }[];
  selfie_url?: string;
  completed: boolean;
}

export interface UserSettings {
  user_id: string;
  notification_time: string;
  dark_mode: boolean;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  image_url: string;
  caption: string;
  created_at: string;
  likes: number;
  comments: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: 'free' | 'premium';
  active: boolean;
  renewal_date?: string;
}