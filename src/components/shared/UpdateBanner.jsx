import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function UpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setShowBanner(true);
          }
        });
      });
    });
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-lg">
      <p className="text-sm font-medium">A new update is available!</p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => window.location.reload()}
        className="rounded-full text-xs"
      >
        Refresh
      </Button>
    </div>
  );
}
