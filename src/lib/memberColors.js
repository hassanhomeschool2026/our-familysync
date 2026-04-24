/** Fallback when `member_color` is unset — brand teal */
export const DEFAULT_MEMBER_ACCENT = '#2f9db6';

export const MEMBER_COLORS = [
  { label: 'Teal',    value: '#0d9488', bg: 'bg-teal-600',    text: 'text-teal-600',    border: 'border-teal-600',    light: 'bg-teal-100' },
  { label: 'Blue',    value: '#2563eb', bg: 'bg-blue-600',    text: 'text-blue-600',    border: 'border-blue-600',    light: 'bg-blue-100' },
  { label: 'Purple',  value: '#7c3aed', bg: 'bg-violet-600',  text: 'text-violet-600',  border: 'border-violet-600',  light: 'bg-violet-100' },
  { label: 'Pink',    value: '#db2777', bg: 'bg-pink-600',    text: 'text-pink-600',    border: 'border-pink-600',    light: 'bg-pink-100' },
  { label: 'Orange',  value: '#ea580c', bg: 'bg-orange-600',  text: 'text-orange-600',  border: 'border-orange-600',  light: 'bg-orange-100' },
  { label: 'Red',     value: '#dc2626', bg: 'bg-red-600',     text: 'text-red-600',     border: 'border-red-600',     light: 'bg-red-100' },
  { label: 'Green',   value: '#16a34a', bg: 'bg-green-600',   text: 'text-green-600',   border: 'border-green-600',   light: 'bg-green-100' },
  { label: 'Amber',   value: '#d97706', bg: 'bg-amber-600',   text: 'text-amber-600',   border: 'border-amber-600',   light: 'bg-amber-100' },
  { label: 'Sky',     value: '#0284c7', bg: 'bg-sky-600',     text: 'text-sky-600',     border: 'border-sky-600',     light: 'bg-sky-100' },
  { label: 'Rose',    value: '#e11d48', bg: 'bg-rose-600',    text: 'text-rose-600',    border: 'border-rose-600',    light: 'bg-rose-100' },
];

export const AVATARS = [
  'Star', 'Heart', 'Sun', 'Moon', 'Flower2', 'Leaf', 'Sparkles',
  'Cloud', 'Snowflake', 'Flame', 'Zap', 'Rainbow', 'Crown',
  'Diamond', 'Music', 'Smile', 'Ghost', 'Rocket', 'Shield', 'Home',
];

export function getColorObj(hex) {
  return MEMBER_COLORS.find(c => c.value === hex) || MEMBER_COLORS[0];
}

export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}