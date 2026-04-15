import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, ListChecks, MapPin, Activity, User } from 'lucide-react';

const tabs = [
  { path: '/', icon: Calendar, label: 'Calendar' },
  { path: '/todo', icon: ListChecks, label: 'To-Do' },
  { path: '/checkin', icon: MapPin, label: 'Check-In' },
  { path: '/feed', icon: Activity, label: 'Feed' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomTabBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}