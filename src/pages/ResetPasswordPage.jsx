import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="flex flex-col items-center justify-center gap-1 mb-4">
            <img
              src="/FSLogoIconOnly-512.png"
              alt="Our FamilySync icon"
              className="h-16 w-16 object-contain"
            />
            <img
              src="/FSLogo_TitleOnly-512.png"
              alt="Our FamilySync"
              className="h-11 w-auto object-contain max-w-[220px]"
            />
          </div>
          <p className="text-[#64748b] dark:text-slate-400 text-base">Reset your password</p>
        </div>
        {done ? (
          <p className="text-center text-sm text-[#64748b] dark:text-slate-400">Password updated! Redirecting...</p>
        ) : (
          <div className="space-y-5">
            <div>
              <Label>New Password</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="auth-screen-input h-12 mt-1" />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="auth-screen-input h-12 mt-1" />
            </div>
            {passwordError && <p className="text-destructive text-sm">{passwordError}</p>}
            <Button variant="authSubmit" onClick={handleReset} disabled={loading} className="w-full">
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
