import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, MapPin } from 'lucide-react';
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
        member_color: '#6366f1',
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
      toast.error('Invalid email or password. Please try again.');
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
      setSignInError('Invalid email or password. Please try again.');
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
      toast.error('Something went wrong. Please try again.');
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Home className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-foreground mb-2">
            <span className="text-primary">Family</span>Sync
          </h1>
          <p className="text-muted-foreground text-base">Your family. In sync.</p>
        </div>

        <div className="flex rounded-xl bg-secondary p-1 mb-6">
          {['signin', 'signup', 'join'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {m === 'signin' ? 'Sign In' : m === 'signup' ? 'Sign Up' : 'Join Family'}
            </button>
          ))}
        </div>

        {mode === 'signin' && !forgotMode && (
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 mt-1" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 mt-1" />
            </div>
            {signInError && <p className="text-destructive text-sm text-center">{signInError}</p>}
            <Button onClick={handleSignIn} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
              {loading ? 'Please wait...' : 'Sign In'}
            </Button>
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                FamilySync uses your location for check-ins, live tracking, and family safety zones. You&apos;ll be prompted to enable it
                after signing in.
              </p>
            </div>
            <button type="button" onClick={() => setForgotMode(true)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
              Forgot password?
            </button>
          </div>
        )}

        {mode === 'signin' && forgotMode && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">Enter your email and we&apos;ll send you a reset link.</p>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 mt-1" />
            </div>
            <Button onClick={handleForgotPassword} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                FamilySync uses your location for check-ins, live tracking, and family safety zones. You&apos;ll be prompted to enable it
                after signing in.
              </p>
            </div>
            <button type="button" onClick={() => setForgotMode(false)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
              ← Back to Sign In
            </button>
          </div>
        )}

        {mode === 'signup' && (
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 mt-1" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 mt-1" />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 mt-1" />
            </div>
            {passwordError && <p className="text-destructive text-sm">{passwordError}</p>}
            <Button onClick={handleSignUp} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
              {loading ? 'Please wait...' : 'Create Account'}
            </Button>
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                FamilySync uses your location for check-ins, live tracking, and family safety zones. You&apos;ll be prompted to enable it
                after signing in.
              </p>
            </div>
          </div>
        )}

        {mode === 'join' && inviteStep === 'code' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">Enter the invite code sent by your family admin.</p>
            <div>
              <Label>Invite Code</Label>
              <Input
                placeholder=""
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="h-12 mt-1 tracking-widest font-mono text-center uppercase text-lg"
                maxLength={6}
              />
            </div>
            <Button onClick={handleValidateCode} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
              {loading ? 'Checking...' : 'Next →'}
            </Button>
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                FamilySync uses your location for check-ins, live tracking, and family safety zones. You&apos;ll be prompted to enable it
                after signing in.
              </p>
            </div>
          </div>
        )}

        {mode === 'join' && inviteStep === 'account' && (
          <div className="space-y-4">
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <p className="text-sm font-medium text-primary">{'\u{2705}'} Code accepted!</p>
              <p className="text-xs text-muted-foreground mt-0.5">Joining: <span className="font-semibold">{validatedFamily?.name}</span></p>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 mt-1" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 mt-1" />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 mt-1" />
            </div>
            {passwordError && <p className="text-destructive text-sm">{passwordError}</p>}
            <Button onClick={handleJoinSubmit} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
              {loading ? 'Joining...' : 'Create Account & Join'}
            </Button>
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                FamilySync uses your location for check-ins, live tracking, and family safety zones. You&apos;ll be prompted to enable it
                after signing in.
              </p>
            </div>
            <button type="button" onClick={() => setInviteStep('code')} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

