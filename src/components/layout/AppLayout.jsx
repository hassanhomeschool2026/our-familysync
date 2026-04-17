import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomTabBar from './BottomTabBar';
import NotificationBell from '../shared/NotificationBell';
import UpdateBanner from '@/components/shared/UpdateBanner';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <UpdateBanner />
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="font-heading font-bold text-lg text-foreground">
            <span className="text-primary">Family</span>Sync
          </h1>
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