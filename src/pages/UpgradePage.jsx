import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown, Users, ListChecks, Bell, Clock, Megaphone } from 'lucide-react';
import { useFamily } from '@/lib/familyContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

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
  const { currentUser } = useFamily();
  const [loading, setLoading] = useState(null);

  const handleCheckout = async (priceId, planName) => {
    setLoading(planName);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;

      if (!email) {
        toast.error('Could not get your email. Please sign out and sign back in.');
        setLoading(null);
        return;
      }

      const response = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: currentUser.id,
          email,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  // Handle success/cancel returns from Stripe
  const params = new URLSearchParams(window.location.search);
  const success = params.get('success');
  const cancelled = params.get('cancelled');

  return (
    <div>
      <button onClick={() => navigate('/profile')} className="flex items-center text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
          <p className="text-green-700 font-semibold">🎉 Welcome to Premium!</p>
          <p className="text-green-600 text-sm mt-1">Your account has been upgraded successfully.</p>
        </div>
      )}

      {cancelled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-center">
          <p className="text-yellow-700 font-semibold">Payment cancelled</p>
          <p className="text-yellow-600 text-sm mt-1">No charge was made. You can try again anytime.</p>
        </div>
      )}

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
        <Button
          onClick={() => handleCheckout('price_1TMdjsCh1f5OvEBZH8Y3XVGg', 'monthly')}
          disabled={loading !== null}
          className="w-full h-14 rounded-xl text-base font-semibold"
        >
          <Crown className="w-5 h-5 mr-2" />
          {loading === 'monthly' ? 'Redirecting...' : '$4.99 / month'}
        </Button>

        <Button
          onClick={() => handleCheckout('price_1TMdlACh1f5OvEBZ0OCECvbq', 'yearly')}
          disabled={loading !== null}
          variant="outline"
          className="w-full h-14 rounded-xl text-base font-semibold"
        >
          {loading === 'yearly' ? 'Redirecting...' : (
            <>
              $45.99 / year
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Save 24%</span>
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-4">
        Payments powered by Stripe · Cancel anytime
      </p>
    </div>
  );
}
