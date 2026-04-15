export const MEMBER_COLORS = [
  { label: 'Teal', value: '#14b8a6', bg: 'bg-teal-500', text: 'text-teal-500', border: 'border-teal-500', light: 'bg-teal-100' },
  { label: 'Blue', value: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', light: 'bg-blue-100' },
  { label: 'Purple', value: '#8b5cf6', bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', light: 'bg-purple-100' },
  { label: 'Pink', value: '#ec4899', bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500', light: 'bg-pink-100' },
  { label: 'Orange', value: '#f97316', bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', light: 'bg-orange-100' },
  { label: 'Red', value: '#ef4444', bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500', light: 'bg-red-100' },
  { label: 'Green', value: '#22c55e', bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500', light: 'bg-green-100' },
  { label: 'Indigo', value: '#6366f1', bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500', light: 'bg-indigo-100' },
  { label: 'Yellow', value: '#eab308', bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500', light: 'bg-yellow-100' },
  { label: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500', light: 'bg-cyan-100' },
];

export const AVATARS = ['😊','😎','🤗','👨','👩','👦','👧','👶','🧑','👴','👵','🐱','🐶','🦊','🐻','🌸','🌟','🏠','❤️','🎉'];

export function getColorObj(hex) {
  return MEMBER_COLORS.find(c => c.value === hex) || MEMBER_COLORS[0];
}

export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}