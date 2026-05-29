import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// No-auth helper: use anon key as Bearer for Edge Function calls
export function fnHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`,
  };
}

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
export type PostType = 'story' | 'carousel';
export type Platform = 'instagram' | 'google_business' | 'linkedin';

export const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; bg: string; border: string; textColor: string }> = {
  instagram: {
    label: 'Instagram',
    color: 'text-pink-400',
    bg: 'bg-pink-500/15',
    border: 'border-pink-500/25',
    textColor: 'text-pink-400',
  },
  google_business: {
    label: 'Google Business',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/25',
    textColor: 'text-emerald-400',
  },
  linkedin: {
    label: 'LinkedIn',
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/25',
    textColor: 'text-sky-400',
  },
};

export interface ScheduledPost {
  id: string;
  user_id: string;
  prompt: string;
  generated_caption: string;
  image_url: string;
  hashtags: string[];
  status: PostStatus;
  post_type: PostType;
  auto_slot: boolean;
  platforms: Platform[];
  published_platforms: Record<string, { status: string; post_id?: string; published_at?: string }>;
  scheduled_at: string | null;
  published_at: string | null;
  instagram_post_id: string;
  theme_output: string;
  image_prompt: string;
  created_at: string;
  updated_at: string;
  post_metrics?: PostMetric[];
}

export interface PostMetric {
  id: string;
  post_id: string;
  views: number;
  likes: number;
  comments: number;
  reached_500: boolean;
  fetched_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  instagram_access_token: string;
  instagram_account_id: string;
  instagram_username: string;
  google_business_access_token: string;
  google_business_location_id: string;
  google_business_account_name: string;
  linkedin_access_token: string;
  linkedin_org_id: string;
  linkedin_username: string;
}

export type AgentRole = 'theme' | 'caption' | 'image';

export interface GptAgent {
  id: string;
  user_id: string;
  name: string;
  role: AgentRole;
  system_prompt: string;
  model: string;
  temperature: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentResult {
  theme: { output: string } | null;
  caption: { output: string; hashtags: string[] } | null;
  image: { output: string; imageUrl: string } | null;
}

export interface AutoScheduleSlot {
  id: string;
  user_id: string;
  time: string;
  post_type: PostType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
