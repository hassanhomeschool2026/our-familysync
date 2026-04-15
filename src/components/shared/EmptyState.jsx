import React from 'react';

export default function EmptyState({ emoji = '🌤️', title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <span className="text-5xl mb-4">{emoji}</span>
      <h3 className="font-heading text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[260px]">{description}</p>
    </div>
  );
}