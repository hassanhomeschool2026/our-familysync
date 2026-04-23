import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomTabBar from './BottomTabBar';
import NotificationBell from '../shared/NotificationBell';
import UpdateBanner from '@/components/shared/UpdateBanner';

export default function AppLayout() {
  return (
    <div className="min-h-screen pb-20">
      <UpdateBanner />
      <header className="sticky top-0 z-40 border-b border-purple-200/40 dark:border-white/[0.08] bg-white/80 backdrop-blur-md dark:bg-background/95 dark:backdrop-blur-md">
        <div className="flex items-center justify-between px-4 h-14 max-w-4xl mx-auto">
          <div className="flex items-center gap-1">
            <img
              src="/FSLogoIconOnly-512.png"
              alt="Our FamilySync icon"
              className="h-8 w-8 object-contain"
            />
            <img
              src="/FSLogo_TitleOnly-512.png"
              alt="Our FamilySync"
              className="h-7 w-auto object-contain"
            />
          </div>
          <NotificationBell />
        </div>
      </header>
      {/* max-w-4xl so wider screens (e.g. /upgrade comparison) aren’t squeezed into phone-width */}
      <main className="w-full max-w-4xl mx-auto px-4 py-4">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}