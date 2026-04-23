import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useFamily } from '@/lib/familyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Users, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MEMBER_COLORS, AVATARS, generateInviteCode } from '@/lib/memberColors';
export default function Welcome() {
  const navigate = useNavigate();
  const { currentUser, reload } = useFamily();
  const [step, setStep] = useState('welcome');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState(currentUser?.full_name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(MEMBER_COLORS[0].value);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      setError('Please enter a family name.');
      return;
    }
    setLoading(true);
    try {
      const userId = currentUser?.id;
      if (!userId) {
        setError('Unable to load your account. Please try signing in again.');
        return;
      }

      const code = generateInviteCode();

      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({ name: familyName.trim(), invite_code: code })
        .select()
        .single();

      if (familyError) throw familyError;

      const displayOrName = displayName.trim() || currentUser?.full_name;

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          family_id: family.id,
          display_name: displayOrName,
          avatar: selectedAvatar,
          member_color: selectedColor,
          role: 'admin',
          plan: 'free',
          notification_prefs: {
            day_before_reminder: true,
            same_day_reminder: 'both',
            task_due_reminders: true,
            family_alerts: true,
            checkin_notifications: true,
          },
        });

      if (profileError) throw profileError;

      await supabase.from('feed_items').insert({
        family_id: family.id,
        user_id: userId,
        user_name: displayOrName,
        user_avatar: selectedAvatar,
        type: 'member_joined',
        message: `${displayOrName} created the family!`,
      });

      await reload();
      navigate('/');
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code.');
      return;
    }
    setLoading(true);
    try {
      const userId = currentUser?.id;
      if (!userId) {
        setError('Unable to load your account. Please try signing in again.');
        return;
      }

      const { data: families, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase());

      if (familyError) throw familyError;
      if (!families || families.length === 0) {
        setError('Invalid invite code. Please check and try again.');
        setLoading(false);
        return;
      }

      const family = families[0];

      const { data: existingMembers } = await supabase
        .from('profiles')
        .select('id, plan')
        .eq('family_id', family.id);

      const memberCount = existingMembers?.length ?? 0;
      const familyHasPremium = (existingMembers || []).some((m) => m.plan === 'premium');

      if (!familyHasPremium && memberCount >= 4) {
        setError(
          'This family has reached the free plan limit of 4 members. The admin needs to upgrade to Premium.'
        );
        setLoading(false);
        return;
      }

      const displayOrName = displayName.trim() || currentUser?.full_name;

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          family_id: family.id,
          display_name: displayOrName,
          avatar: selectedAvatar,
          member_color: selectedColor,
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

      if (profileError) throw profileError;

      await supabase
        .from('families')
        .update({ invite_code: generateInviteCode() })
        .eq('id', family.id);

      await supabase.from('feed_items').insert({
        family_id: family.id,
        user_id: userId,
        user_name: displayOrName,
        user_avatar: selectedAvatar,
        type: 'member_joined',
        message: `${displayOrName} joined the family!`,
      });

      await reload();
      navigate('/');
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm text-center"
          >
            <div className="mb-8">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Home className="w-10 h-10 text-primary" />
              </div>
              <h1 className="font-heading text-3xl font-extrabold text-foreground mb-2">
                Our <span className="text-primary">Family</span>Sync
              </h1>
              <p className="text-muted-foreground text-base">Your family. In sync.</p>
            </div>
            <div className="space-y-3">
              <Button onClick={() => setStep('create')} className="w-full h-14 text-base font-semibold rounded-xl">
                <Home className="w-5 h-5 mr-2" /> Create a Family
              </Button>
              <Button onClick={() => setStep('join')} variant="outline" className="w-full h-14 text-base font-semibold rounded-xl">
                <Users className="w-5 h-5 mr-2" /> Join a Family
              </Button>
            </div>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
              className="text-xs text-muted-foreground hover:text-foreground mt-4"
            >
              Sign out
            </button>
          </motion.div>
        )}

        {step === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm"
          >
            <button onClick={() => { setStep('welcome'); setError(''); }} className="flex items-center text-muted-foreground mb-6">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <h2 className="font-heading text-2xl font-bold mb-1">Create Your Family</h2>
            <p className="text-muted-foreground mb-6">Give your household a name to get started.</p>
            <div className="space-y-4">
              <div>
                <Label>Family Name</Label>
                <Input placeholder="e.g. The Johnsons" value={familyName} onChange={(e) => { setFamilyName(e.target.value); setError(''); }} className="h-12 mt-1" />
              </div>
              <div>
                <Label>Your Display Name</Label>
                <Input placeholder="Your name" value={displayName} onChange={(e) => { setDisplayName(e.target.value); setError(''); }} className="h-12 mt-1" />
              </div>
              <div>
                <Label className="mb-2 block">Pick an Avatar</Label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((a) => (
                    <button key={a} onClick={() => setSelectedAvatar(a)} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${selectedAvatar === a ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary'}`}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Pick a Color</Label>
                <div className="flex flex-wrap gap-2">
                  {MEMBER_COLORS.map((c) => (
                    <button key={c.value} onClick={() => setSelectedColor(c.value)} className={`w-10 h-10 rounded-xl ${selectedColor === c.value ? 'ring-2 ring-offset-2 ring-foreground' : ''}`} style={{ backgroundColor: c.value }} />
                  ))}
                </div>
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button onClick={handleCreateFamily} disabled={loading} className="w-full h-12 rounded-xl">
                {loading ? 'Creating...' : 'Create Family'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm"
          >
            <button onClick={() => { setStep('welcome'); setError(''); }} className="flex items-center text-muted-foreground mb-6">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <h2 className="font-heading text-2xl font-bold mb-1">Join a Family</h2>
            <p className="text-muted-foreground mb-6">Enter the invite code shared by your family admin.</p>
            <div className="space-y-4">
              <div>
                <Label>Your Display Name</Label>
                <Input placeholder="Your name" value={displayName} onChange={(e) => { setDisplayName(e.target.value); setError(''); }} className="h-12 mt-1" />
              </div>
              <div>
                <Label>Invite Code</Label>
                <Input placeholder="e.g. HOME-1234" value={inviteCode} onChange={(e) => { setInviteCode(e.target.value); setError(''); }} className="h-12 mt-1" />
              </div>
              <div>
                <Label className="mb-2 block">Pick an Avatar</Label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((a) => (
                    <button key={a} onClick={() => setSelectedAvatar(a)} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${selectedAvatar === a ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary'}`}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Pick a Color</Label>
                <div className="flex flex-wrap gap-2">
                  {MEMBER_COLORS.map((c) => (
                    <button key={c.value} onClick={() => setSelectedColor(c.value)} className={`w-10 h-10 rounded-xl ${selectedColor === c.value ? 'ring-2 ring-offset-2 ring-foreground' : ''}`} style={{ backgroundColor: c.value }} />
                  ))}
                </div>
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button onClick={handleJoinFamily} disabled={loading} className="w-full h-12 rounded-xl">
                {loading ? 'Joining...' : 'Join Family'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
