import * as LucideIcons from 'lucide-react';
import { AVATARS } from '@/lib/memberColors';

/**
 * Selectable icon grid for profile / welcome — values match `profiles.avatar` (Lucide icon name strings).
 */
export default function AvatarIconGrid({ value, onChange, iconClassName = 'w-5 h-5' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {AVATARS.map((name) => {
        const Icon = LucideIcons[name];
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-foreground ${
              value === name
                ? 'bg-primary/20 ring-2 ring-primary'
                : 'bg-secondary'
            }`}
            aria-label={`Avatar ${name}`}
            aria-pressed={value === name}
          >
            {Icon ? <Icon className={iconClassName} /> : null}
          </button>
        );
      })}
    </div>
  );
}
