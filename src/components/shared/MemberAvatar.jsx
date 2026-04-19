import React from 'react';

export default function MemberAvatar({ avatar, avatarUrl, color, size = 'md', name }) {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const borderColor = color || '#94a3b8';
  const bgColor = color ? `${color}25` : '#f1f5f9';

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
        style={{ borderColor, borderWidth: '2px', borderStyle: 'solid' }}
        title={name}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center flex-shrink-0 font-semibold`}
      style={{ backgroundColor: bgColor, borderColor, borderWidth: '2px', borderStyle: 'solid', color: borderColor }}
      title={name}
    >
      {getInitials(name || avatar)}
    </div>
  );
}
