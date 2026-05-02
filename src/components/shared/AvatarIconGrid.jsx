import React, { useRef } from 'react';
import { AVATARS, getAvatarUrl } from '@/lib/memberColors';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AvatarCarousel({ value, onChange }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  return (
    <div className="space-y-3">
      {/* Selected preview */}
      {value && value.startsWith('avatar:') && (
        <div className="flex items-center gap-3">
          <img
            src={getAvatarUrl(value)}
            alt="Selected avatar"
            className="w-16 h-16 rounded-full object-cover ring-2 ring-primary ring-offset-2 bg-muted"
          />
          <div>
            <p className="text-sm font-medium">Selected</p>
            <p className="text-xs text-muted-foreground">Tap another to change</p>
          </div>
        </div>
      )}

      {/* Carousel */}
      <div className="relative">
        <button
          type="button"
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card border border-border shadow flex items-center justify-center hover:bg-secondary transition-colors"
          aria-label="Scroll avatars left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-8 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ msOverflowStyle: 'none' }}
        >
          {AVATARS.map((avatarKey) => {
            const url = getAvatarUrl(avatarKey);
            const isSelected = value === avatarKey;
            return (
              <button
                key={avatarKey}
                type="button"
                onClick={() => onChange(avatarKey)}
                className={`flex-shrink-0 w-16 h-16 rounded-full overflow-hidden transition-all duration-150 ${
                  isSelected
                    ? 'ring-2 ring-primary ring-offset-2 scale-110 shadow-lg'
                    : 'ring-2 ring-transparent hover:ring-primary/40 hover:scale-105'
                }`}
                aria-label={`Select avatar ${avatarKey}`}
                aria-pressed={isSelected}
              >
                <img
                  src={url}
                  alt={avatarKey}
                  className="w-full h-full object-cover bg-muted"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card border border-border shadow flex items-center justify-center hover:bg-secondary transition-colors"
          aria-label="Scroll avatars right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
