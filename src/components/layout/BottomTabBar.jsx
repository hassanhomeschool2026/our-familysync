import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Home, Calendar, ListChecks, MapPin, User, CheckSquare } from 'lucide-react';

const MotionLink = motion.create(Link);

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/todo', icon: ListChecks, label: 'To-Do' },
  { path: '/chores', icon: CheckSquare, label: 'Chores' },
  { path: '/checkin', icon: MapPin, label: 'Check-In' },
  { path: '/profile', icon: User, label: 'Settings' },
];

export default function BottomTabBar() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border dark:border-white/[0.08] z-50 safe-area-bottom shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-around h-16 max-w-4xl mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;
          return (
            <MotionLink
              key={tab.path}
              to={tab.path}
              whileTap={{ scale: reduceMotion ? 1 : 0.97 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <motion.span
                className="flex flex-col items-center justify-center"
                animate={{
                  scale: isActive && !reduceMotion ? 1.06 : 1,
                }}
                transition={
                  reduceMotion
                    ? { duration: 0.2 }
                    : {
                        type: 'spring',
                        stiffness: 420,
                        damping: 32,
                        mass: 0.85,
                      }
                }
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </motion.span>
            </MotionLink>
          );
        })}
      </div>
    </nav>
  );
}