import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Crown,
  Users,
  ListChecks,
  Bell,
  Megaphone,
  Clock,
  MapPin,
  Shield,
  ShieldCheck,
  Mail,
  Headphones,
  Star,
  Leaf,
  Lock,
} from 'lucide-react';
import { useFamily } from '@/lib/familyContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function UpgradePage() {
  const navigate = useNavigate();
  const { currentUser } = useFamily();
  const [loading, setLoading] = useState(null);
  const [promoCode] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');

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
          promoCode,
        }),
      });

      const raw = await response.text();
      let data = {};
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          // Non-JSON body (e.g. Vite 404 HTML)
        }
      }

      if (!response.ok) {
        if (response.status === 404) {
          toast.error(
            'Stripe checkout needs Netlify Functions. Use npm run dev:netlify and open the app URL it shows (not :5173 alone).'
          );
        } else {
          toast.error(data.error || `Checkout failed (${response.status}). Please try again.`);
        }
        return;
      }

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
    <div
      className="min-h-screen px-4 pt-4 pb-32"
      style={{
        background:
          'linear-gradient(180deg, rgba(1,220,186,0.06) 0%, rgba(59,130,246,0.05) 60%, rgba(127,48,203,0.03) 100%)',
      }}
    >
      <button
        type="button"
        onClick={() => navigate('/profile')}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back
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

      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-yellow-300 text-sm">✦</span>
          <Crown className="w-6 h-6 text-yellow-400" />
          <span className="text-yellow-300 text-sm">✦</span>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Upgrade to Premium</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
        Unlock powerful features that helpkeep your family connected and in sync.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-5 flex flex-col w-full lg:flex-1 lg:basis-0 min-h-0">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-3">
            <Leaf className="w-5 h-5 text-teal-500" />
          </div>
          <h2 className="font-heading text-xl font-bold text-center">Free</h2>
          <p className="text-xs text-muted-foreground text-center mt-1 mb-4">
            Essential features to keep your family organized and in sync.
          </p>
          <div className="border-t border-gray-100 mb-4" />

          {[
            [Users, 'Up to 5 household members'],
            [ListChecks, 'Up to 10 tasks'],
            [MapPin, 'Basic check-ins'],
            [Shield, 'Safe zones (up to 3)'],
            [Clock, 'Activity history (7 days)'],
            [Mail, 'Email support'],
          ].map(([Icon, text]) => (
            <div key={text} className="flex items-start justify-start gap-3 py-2">
              <Icon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground/80 text-left flex-1 min-w-0">{text}</span>
            </div>
          ))}

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-4 self-center w-fit min-w-[11rem] px-6 h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-foreground/60 hover:bg-gray-50 transition-colors inline-flex items-center justify-center text-center"
          >
            Continue with Free
          </button>
        </div>

        <div className="bg-white rounded-[20px] shadow-md border border-gray-100 flex flex-col w-full lg:flex-1 lg:basis-0 min-h-0 overflow-hidden">
          <div
            className="relative rounded-t-[20px] p-5 pb-6 overflow-hidden text-center"
            style={{
              background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #7f30cb 100%)',
            }}
          >
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/20 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
              <Star className="w-3 h-3" /> Most Popular
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-2 mx-auto">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-white">Premium</h2>
            <p className="text-white/80 text-xs mt-1 max-w-sm mx-auto">
            Everything in Free, plus powerful tools for a more connected, organized family.
            </p>
          </div>

          <div className="p-5 flex flex-col gap-5 flex-1">
            <div>
              {[
                [Users, 'Unlimited household members'],
                [ListChecks, 'Unlimited tasks with priorities'],
                [Bell, 'Push notifications (reminders & alerts)'],
                [Megaphone, 'Family Update broadcasts'],
                [Shield, 'Unlimited safe zones'],
                [Clock, 'Full activity history'],
                [Crown, 'Premium badge on profile'],
                [Headphones, 'Priority support'],
              ].map(([Icon, text]) => (
                <div key={text} className="flex items-start justify-start gap-3 py-2">
                  <Icon className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground/80 text-left flex-1 min-w-0">{text}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="flex bg-gray-100 rounded-full p-0.5">
                {['monthly', 'yearly'].map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
                      billingCycle === cycle
                        ? 'bg-white text-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Save 33%
              </span>
            </div>

            <div className="text-center">
              <div className="flex items-end gap-1 justify-center">
                <span className="text-4xl font-extrabold text-foreground">
                  {billingCycle === 'monthly' ? '$9.99' : '$79.99'}
                </span>
                <span className="text-sm text-muted-foreground mb-1">
                  {billingCycle === 'monthly' ? '/month' : '/year'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {billingCycle === 'monthly' ? 'Billed monthly' : 'Billed yearly'}
              </p>
            </div>

            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                handleCheckout(
                  billingCycle === 'monthly'
                    ? import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID
                    : import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID,
                  billingCycle
                )
              }
              className="w-full h-12 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #7f30cb 100%)',
                boxShadow: '0 4px 14px rgba(14,165,233,0.3)',
              }}
            >
              {loading !== null ? 'Redirecting...' : 'Go Premium'}
            </button>

            <div className="flex items-center justify-center gap-1 -mt-2">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="font-heading font-bold text-sm text-teal-600 text-center">Safe. Secure. Trusted.</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">
              Your family&apos;s data is protected with privacy and security in mind.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-5 pt-1">
            <div className="flex flex-col items-center gap-1">
              <Lock className="w-5 h-5 text-teal-500" />
              <span className="text-[11px] text-muted-foreground text-center">Secure Encryption</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <span className="text-[11px] text-muted-foreground text-center">Privacy Focused</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Users className="w-5 h-5 text-purple-500" />
              <span className="text-[11px] text-muted-foreground text-center">Family First</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground mt-5">
        Payments powered by Stripe · Cancel anytime
      </p>
    </div>
  );
}
