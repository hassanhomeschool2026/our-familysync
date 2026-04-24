import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { generateInviteCode } from '@/lib/memberColors';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteStep, setInviteStep] = useState('code');
  const [validatedFamily, setValidatedFamily] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [signInError, setSignInError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleValidateCode = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code.');
      return;
    }
    setLoading(true);
    try {
      const { data: families, error } = await supabase
        .from('families')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase());
      if (error) throw error;
      if (!families || families.length === 0) {
        toast.error('Invalid invite code. Please check and try again.');
        return;
      }
      const family = families[0];
      const { data: existingMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('family_id', family.id);
      if (existingMembers && existingMembers.length >= 4) {
        toast.error('This family has reached the free plan limit. Ask the admin to upgrade.');
        return;
      }
      setValidatedFamily(family);
      setInviteStep('account');
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = async () => {
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError('');
    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      const userId = signUpData?.user?.id;
      if (!userId) throw new Error('Could not create account.');

      await supabase.from('profiles').upsert({
        id: userId,
        family_id: validatedFamily.id,
        display_name: email.split('@')[0],
        avatar: '\u{1F60A}',
        member_color: '#2f9db6',
        role: 'member',
        plan: 'free',
        notification_prefs: {
          day_before_reminder: true,
          same_day_reminder: 'both',
          task_due_reminders: true,
          family_alerts: true,
          checkin_notifications: true,
        },
      });

      await supabase.from('families')
        .update({ invite_code: generateInviteCode() })
        .eq('id', validatedFamily.id);

      await supabase.from('feed_items').insert({
        family_id: validatedFamily.id,
        user_id: userId,
        user_name: email.split('@')[0],
        user_avatar: '\u{1F60A}',
        type: 'member_joined',
        message: `${email.split('@')[0]} joined the family!`,
      });

      toast.success('Welcome to the family!');
      window.location.href = '/';
    } catch (e) {
      const msg = (e?.message || String(e) || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists')) {
        toast.error('An account with this email already exists. Try signing in instead.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setSignInError('Please enter your email and password.');
      return;
    }
    setSignInError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = '/';
    } catch (e) {
      setSignInError('Incorrect email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError('');
    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast.success('Account created! Please sign in.');
      setMode('signin');
    } catch (e) {
      const msg = (e?.message || String(e) || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists')) {
        toast.error('An account with this email already exists. Try signing in instead.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setInviteStep('code');
    setValidatedFamily(null);
    setInviteCode('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setForgotMode(false);
    setPasswordError('');
    setSignInError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    try {
      if (!email.trim()) {
        toast.error('Please enter your email address.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://app.familysync.zencora.org/reset-password',
      });
      if (error) throw error;
      toast.success('Password reset email sent! Check your inbox.');
      setForgotMode(false);
    } catch (e) {
      toast.error('No account found with that email address.');
    } finally {
      setLoading(false);
    }
  };

  const locationInfo = (
    <div className="rounded-xl px-3.5 py-3 flex items-start gap-2.5 bg-[rgba(59,130,246,0.08)] dark:bg-blue-500/10">
      <MapPin className="w-5 h-5 text-[#3b82f6] shrink-0 mt-0.5" aria-hidden />
      <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
        Our FamilySync uses your location for check-ins, live tracking, and family safety zones. You&apos;ll be prompted to enable it
        after signing in.
      </p>
    </div>
  );

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
          <p className="text-[#64748b] dark:text-slate-400 text-base">Your family. In sync.</p>
        </div>

        <div className="flex rounded-full bg-black/5 dark:bg-white/10 p-1 mb-6">
          {['signin', 'signup', 'join'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
                mode === m
                  ? 'bg-white dark:bg-card text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02]'
                  : 'text-[#64748b] dark:text-slate-400'
              }`}
            >
              {m === 'signin' ? 'Sign In' : m === 'signup' ? 'Sign Up' : 'Join Family'}
            </button>
          ))}
        </div>

        {mode === 'signin' && !forgotMode && (
          <div className="space-y-5">
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-screen-input h-12 mt-1" />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-screen-input h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[#64748b] hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {signInError && <p className="text-destructive text-sm mt-1.5">{signInError}</p>}
            </div>
            <Button variant="authSubmit" onClick={handleSignIn} disabled={loading} className="w-full">
              {loading ? 'Please wait...' : 'Sign In'}
            </Button>
            {locationInfo}
            <button
              type="button"
              onClick={() => setForgotMode(true)}
              className="w-full text-center text-sm text-[#64748b] hover:text-[#0d9488] dark:text-slate-400 dark:hover:text-teal-400 transition-colors"
            >
              Forgot password?
            </button>
          </div>
        )}

        {mode === 'signin' && forgotMode && (
          <div className="space-y-5">
            <p className="text-sm text-[#64748b] dark:text-slate-400 text-center">Enter your email and we&apos;ll send you a reset link.</p>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-screen-input h-12 mt-1" />
            </div>
            <Button variant="authSubmit" onClick={handleForgotPassword} disabled={loading} className="w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            {locationInfo}
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="w-full text-center text-sm text-[#64748b] hover:text-[#0d9488] dark:text-slate-400 dark:hover:text-teal-400 transition-colors"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {mode === 'signup' && (
          <div className="space-y-5">
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-screen-input h-12 mt-1" />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-screen-input h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[#64748b] hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Confirm Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-screen-input h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[#64748b] hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {passwordError && <p className="text-destructive text-sm">{passwordError}</p>}
            <Button variant="authSubmit" onClick={handleSignUp} disabled={loading} className="w-full">
              {loading ? 'Please wait...' : 'Create Account'}
            </Button>
            {locationInfo}
          </div>
        )}

        {mode === 'join' && inviteStep === 'code' && (
          <div className="space-y-5">
            <p className="text-sm text-[#64748b] dark:text-slate-400 text-center">Enter the invite code sent by your family admin.</p>
            <div>
              <Label>Invite Code</Label>
              <Input
                placeholder=""
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="auth-screen-input h-12 mt-1 tracking-widest font-mono text-center uppercase text-lg"
                maxLength={6}
              />
            </div>
            <Button variant="authSubmit" onClick={handleValidateCode} disabled={loading} className="w-full">
              {loading ? 'Checking...' : 'Next →'}
            </Button>
            {locationInfo}
          </div>
        )}

        {mode === 'join' && inviteStep === 'account' && (
          <div className="space-y-5">
            <div className="surface-1 p-3.5 text-center border border-black/[0.06] dark:border-white/10">
              <p className="text-sm font-medium text-[#0d9488] dark:text-teal-400">{'\u{2705}'} Code accepted!</p>
              <p className="text-xs text-[#475569] dark:text-slate-400 mt-1">
                Joining: <span className="font-semibold text-foreground">{validatedFamily?.name}</span>
              </p>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-screen-input h-12 mt-1" />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-screen-input h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[#64748b] hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Confirm Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-screen-input h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[#64748b] hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {passwordError && <p className="text-destructive text-sm">{passwordError}</p>}
            <Button variant="authSubmit" onClick={handleJoinSubmit} disabled={loading} className="w-full">
              {loading ? 'Joining...' : 'Create Account & Join'}
            </Button>
            {locationInfo}
            <button
              type="button"
              onClick={() => setInviteStep('code')}
              className="w-full text-center text-sm text-[#64748b] hover:text-[#0d9488] dark:text-slate-400 dark:hover:text-teal-400 transition-colors"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

