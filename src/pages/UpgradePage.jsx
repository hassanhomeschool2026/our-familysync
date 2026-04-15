import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown, Check, Users, ListChecks, Bell, Clock, Megaphone } from 'lucide-react';

const features = [
  { icon: Users, text: 'Unlimited household members' },
  { icon: ListChecks, text: 'Unlimited tasks with priorities' },
  { icon: Bell, text: 'Push notifications (reminders & alerts)' },
  { icon: Megaphone, text: 'Family Alert broadcasts' },
  { icon: Clock, text: 'Full activity history' },
  { icon: Crown, text: 'Premium badge on profile' },
];

export default function UpgradePage() {
  const navigate = useNavigate();

  return (
    <div>
      <button onClick={() => navigate('/profile')} className="flex items-center text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-yellow-500" />
        </div>
        <h2 className="font-heading text-2xl font-bold">Go Premium</h2>
        <p className="text-muted-foreground text-sm mt-1">Unlock all features for your family</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="space-y-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{f.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Button className="w-full h-14 rounded-xl text-base font-semibold">
          <Crown className="w-5 h-5 mr-2" />
          $4.99 / month
        </Button>
        <Button variant="outline" className="w-full h-14 rounded-xl text-base font-semibold">
          $39.99 / year
          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Save 33%</span>
        </Button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-4">
        Payments powered by Stripe · Cancel anytime
      </p>
    </div>
  );
}