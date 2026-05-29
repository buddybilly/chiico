import { formatDistanceToNow } from 'date-fns';

export function timeAgo(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return 'just now';
  }
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

export function parseHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g);
  return matches ? matches.map(t => t.slice(1).toLowerCase()) : [];
}

export function parseMentions(text: string): string[] {
  const matches = text.match(/@[\w]+/g);
  return matches ? matches.map(t => t.slice(1).toLowerCase()) : [];
}

export function renderText(text: string): string {
  return text
    .replace(/#([\w]+)/g, '<span class="text-green-neon cursor-pointer hover:underline">#$1</span>')
    .replace(/@([\w]+)/g, '<span class="text-green-neon cursor-pointer hover:underline">@$1</span>');
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getAvatarFallback(name: string): string {
  return name ? name.charAt(0).toUpperCase() : '?';
}

export function generateUsername(email: string): string {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

export const PEXELS_AVATARS = [
  'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150',
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
  'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
];

export const PEXELS_BANNERS = [
  'https://images.pexels.com/photos/1089438/pexels-photo-1089438.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

export const PEXELS_POSTS = [
  'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3849167/pexels-photo-3849167.jpeg?auto=compress&cs=tinysrgb&w=800',
];
