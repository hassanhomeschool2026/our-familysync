import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';

const headerBarStyle = {
  background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
  borderRadius: '14px',
  padding: '12px 16px',
  boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
  marginBottom: '16px',
};

const chevronButtonStyle = {
  color: 'rgba(255, 255, 255, 0.85)',
  background: 'rgba(255, 255, 255, 0.15)',
  borderRadius: '8px',
  padding: '6px',
  border: 'none',
};

export default function CalendarHeader({ view, setView, currentDate, setCurrentDate, children }) {
  const navigate = (dir) => {
    const fn = dir === 'next'
      ? (view === 'month' ? addMonths : view === 'week' ? addWeeks : addDays)
      : (view === 'month' ? subMonths : view === 'week' ? subWeeks : subDays);
    setCurrentDate(fn(currentDate, 1));
  };

  const label = view === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : view === 'week'
    ? `Week of ${format(currentDate, 'MMM d')}`
    : format(currentDate, 'EEEE, MMM d');

  const starStyles = `
  @keyframes calStarTwinkle {
    0%, 100% { opacity: 0.2; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
  }
`;

  const stars = [
    { left: '8%', top: '20%', size: 2, delay: '0s', dur: '2.2s' },
    { left: '15%', top: '70%', size: 1.5, delay: '0.4s', dur: '3s' },
    { left: '25%', top: '35%', size: 2.5, delay: '1.1s', dur: '2.5s' },
    { left: '35%', top: '75%', size: 1.5, delay: '0.7s', dur: '2.8s' },
    { left: '48%', top: '25%', size: 2, delay: '1.5s', dur: '2s' },
    { left: '58%', top: '65%', size: 1.5, delay: '0.2s', dur: '3.2s' },
    { left: '68%', top: '30%', size: 2, delay: '0.9s', dur: '2.4s' },
    { left: '78%', top: '72%', size: 1.5, delay: '1.3s', dur: '2.7s' },
    { left: '88%', top: '40%', size: 2.5, delay: '0.5s', dur: '2.1s' },
    { left: '93%', top: '75%', size: 1.5, delay: '1.8s', dur: '3.1s' },
  ];

  return (
    <>
      <div className="relative overflow-hidden" style={headerBarStyle}>
        <style>{starStyles}</style>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            borderRadius: 'inherit',
            zIndex: 0,
          }}
        >
          {stars.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: s.left,
                top: s.top,
                width: `${s.size}px`,
                height: `${s.size}px`,
                borderRadius: '50%',
                background: 'white',
                animation: `calStarTwinkle ${s.dur} ease-in-out infinite`,
                animationDelay: s.delay,
                boxShadow: `0 0 ${s.size * 2}px rgba(255,255,255,0.8)`,
              }}
            />
          ))}
        </div>
        <div
          className="relative z-[1] grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div className="flex justify-end pr-0.5">
            <button
              type="button"
              onClick={() => navigate('prev')}
              aria-label="Previous"
              className="cursor-pointer transition-opacity hover:opacity-90"
              style={chevronButtonStyle}
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <h2 className="font-heading min-w-0 text-center text-base font-extrabold leading-tight text-white">
            {label}
          </h2>
          <div className="flex justify-start pl-0.5">
            <button
              type="button"
              onClick={() => navigate('next')}
              aria-label="Next"
              className="cursor-pointer transition-opacity hover:opacity-90"
              style={chevronButtonStyle}
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
      {children}
      <div className="flex flex-wrap items-center gap-2">
        {['day', 'week', 'month'].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`text-sm font-medium capitalize transition-colors rounded-full px-4 py-2 ${
              view === v
                ? 'bg-[#1e3a8a] text-white'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </>
  );
}
