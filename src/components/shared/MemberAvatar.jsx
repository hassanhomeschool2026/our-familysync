import React from 'react';

export default function MemberAvatar({ avatar, color, size = 'md', name }) {
  const sizes = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-9 h-9 text-lg',
    lg: 'w-12 h-12 text-2xl',
    xl: 'w-16 h-16 text-3xl',
  };

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: color ? `${color}20` : '#e2e8f0', borderColor: color || '#94a3b8', borderWidth: '2px' }}
      title={name}
    >
      {avatar || '👤'}
    </div>
  );
}