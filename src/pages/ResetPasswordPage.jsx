import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }, []);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      toast.error('Please fill in both fields.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success('Password updated! Please sign in.');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Home className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-foreground mb-2">
            Our <span className="text-primary">Family</span>Sync
          </h1>
          <p className="text-muted-foreground text-base">Reset your password</p>
        </div>
        {done ? (
          <p className="text-center text-sm text-muted-foreground">Password updated! Redirecting...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 mt-1" />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 mt-1" />
            </div>
            {passwordError && <p className="text-destructive text-sm">{passwordError}</p>}
            <Button onClick={handleReset} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
