import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomTabBar from './BottomTabBar';
import NotificationBell from '../shared/NotificationBell';
import UpdateBanner from '@/components/shared/UpdateBanner';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <UpdateBanner />
      <header className="sticky top-0 z-40 border-b border-purple-200/40 dark:border-white/[0.08] bg-gradient-to-br from-[#f3f0ff] via-[#ede9fe] to-[#e8f7f4] dark:from-[#1D2A36] dark:via-[#1D2A36] dark:to-[#18212B]">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
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
      <main className="max-w-lg mx-auto px-4 py-4">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}