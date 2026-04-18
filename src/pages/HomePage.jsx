import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CalendarPage from './CalendarPage';

const IOS_GEO_RESET_MESSAGE =
  "To fix this, you need to reset location for this app:\n\niPhone: \n1. Press and hold the FamilySync icon on your home screen\n2. Tap 'Edit Home Screen' \n3. Delete FamilySync\n4. Open Chrome, go to app.familysync.zencora.org\n5. When prompted, tap Allow for location\n6. Reinstall: tap Share icon → Add to Home Screen";

const GEO_OPTS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

export default function HomePage() {
  const [showPwaLocationPrompt, setShowPwaLocationPrompt] = useState(false);
  const [showIosGeoResetModal, setShowIosGeoResetModal] = useState(false);

  useEffect(() => {
    const isInstalledPWA =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    const alreadyGranted = localStorage.getItem('pwaLocationGranted') === 'true';
    if (isInstalledPWA && !alreadyGranted) {
      setShowPwaLocationPrompt(true);
    }
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      localStorage.setItem('pwaLocationGranted', 'true');
      setShowPwaLocationPrompt(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        localStorage.setItem('pwaLocationGranted', 'true');
        setShowPwaLocationPrompt(false);
        toast.success('Location enabled!');
      },
      (err) => {
        setShowPwaLocationPrompt(false);
        if (err.code === err.PERMISSION_DENIED) {
          setShowIosGeoResetModal(true);
        } else {
          localStorage.setItem('pwaLocationGranted', 'true');
        }
      },
      GEO_OPTS
    );
  };

  return (
    <>
      <CalendarPage />

      {showPwaLocationPrompt && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-location-title"
        >
          <div className="w-full max-w-md space-y-6 text-center">
            <h2 id="pwa-location-title" className="font-heading text-xl font-bold text-foreground">
              📍 Enable Location
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {`FamilySync needs your location for check-ins, live tracking, and family safety zones. Tap the button below to enable it now.`}
            </p>
            <div className="flex flex-col gap-3">
              <Button type="button" onClick={requestLocation} className="w-full rounded-xl">
                Enable Location Now
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPwaLocationPrompt(false)}
                className="w-full rounded-xl"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      )}

      {showIosGeoResetModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-geo-reset-title"
        >
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-md w-full p-5 space-y-4">
            <h3 id="ios-geo-reset-title" className="font-heading text-lg font-bold">
              Reset Location Permission
            </h3>
            <p className="text-sm text-foreground whitespace-pre-line">{IOS_GEO_RESET_MESSAGE}</p>
            <Button
              type="button"
              onClick={() => setShowIosGeoResetModal(false)}
              className="w-full rounded-xl"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
