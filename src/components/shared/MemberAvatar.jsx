import React from 'react';
import { DEFAULT_MEMBER_ACCENT } from '@/lib/memberColors';

export default function MemberAvatar({ avatar, avatarUrl, color, size = 'md', name }) {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const ringHex = color || DEFAULT_MEMBER_ACCENT;

  const getInitials = (n) => {
    if (!n) return '?';
    const parts = n.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Member'}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0`}
        style={{ borderColor: ringHex, borderWidth: '2px', borderStyle: 'solid' }}
        title={name}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center flex-shrink-0 font-semibold bg-muted text-muted-foreground`}
      style={{ borderColor: ringHex, borderWidth: '2px', borderStyle: 'solid' }}
      title={name}
    >
      {getInitials(name || avatar)}
    </div>
  );
}
