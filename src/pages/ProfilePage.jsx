import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabaseClient';
import { useFamily } from '@/lib/familyContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MEMBER_COLORS } from '@/lib/memberColors';
import MemberAvatar from '@/components/shared/MemberAvatar';
import {
  Settings, Shield, LogOut, Crown, Bell, ChevronRight, Trash2, Camera, X, Sun, Moon, Monitor,
} from 'lucide-react';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const { currentUser, family, members, isAdmin, isPremium, reload } = useFamily();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [color, setColor] = useState(currentUser?.member_color || MEMBER_COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestDeleteConfirmText, setRequestDeleteConfirmText] = useState('');
  const [showRequestDeleteModal, setShowRequestDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [sendingLeave, setSendingLeave] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const prefs = currentUser?.notification_prefs || {};

  const memberList = members || [];
  const otherMembers = memberList.filter((m) => m.id !== currentUser?.id);
  const deleteAccountDescription = (() => {
    if (isAdmin && otherMembers.length > 0) {
      return `You are the admin of this family. Another member will be promoted to admin, then your profile will be removed from the family. This cannot be undone.`;
    }
    if (isAdmin && otherMembers.length === 0) {
      return `You are the only member. Your family will be deleted and your profile will be removed from the family. This cannot be undone.`;
    }
    return `You will be removed from this family. This cannot be undone.`;
  })();

  const handleSaveProfile = async () => {
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ display_name: displayName, member_color: color })
      .eq('id', currentUser.id);
    await reload();
    setSaving(false);
    setEditing(false);
  };

  const toggleNotifPref = async (key, value) => {
    const updated = { ...prefs, [key]: value };
    await supabase
      .from('profiles')
      .update({ notification_prefs: updated })
      .eq('id', currentUser.id);
    await reload();
  };

  const handleLogout = async () => {
    const name = currentUser?.display_name || currentUser?.full_name || 'A member';
    await supabase.from('feed_items').insert({
      family_id: family.id,
      user_id: currentUser.id,
      user_name: name,
      user_avatar: currentUser.avatar,
      type: 'family_alert',
      message: `${name} signed out of Our FamilySync.`,
    });
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm.');
      return;
    }
    setDeletingAccount(true);
    try {
      if (isAdmin) {
        if (otherMembers.length === 0) {
          await supabase.from('families').delete().eq('id', family.id);
        } else {
          const nextAdmin = otherMembers[0];
          await supabase.from('profiles').update({ role: 'admin' }).eq('id', nextAdmin.id);
          toast.info(`${nextAdmin.display_name || nextAdmin.full_name} has been promoted to admin.`);
        }
      }
      await supabase.from('profiles').update({ family_id: null, role: 'member' }).eq('id', currentUser.id);
      await supabase.from('feed_items').insert({
        family_id: family.id,
        user_id: currentUser.id,
        user_name: currentUser?.display_name || currentUser?.full_name || 'A member',
        user_avatar: currentUser.avatar,
        type: 'family_alert',
        message: `${currentUser?.display_name || currentUser?.full_name || 'A member'} deleted their account.`,
      });
      toast.success('Your account has been deleted.');
      await supabase.auth.signOut();
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
      setDeletingAccount(false);
    }
  };

  const handleRequestDelete = async () => {
    if (requestDeleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm.');
      return;
    }
    const name = currentUser?.display_name || currentUser?.full_name || 'A member';
    const admins = members.filter(m => m.role === 'admin');
    if (admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map(a => ({
          user_id: a.id,
          type: 'family_alert',
          message: `${name} has requested to delete their account.|${currentUser.id}`,
          read: false,
        }))
      );
    }
    await supabase.from('feed_items').insert({
      family_id: family.id,
      user_id: currentUser.id,
      user_name: name,
      user_avatar: currentUser.avatar,
      type: 'family_alert',
      message: `${name} has requested to delete their account.`,
    });
    setShowRequestDeleteModal(false);
    setRequestDeleteConfirmText('');
    toast.success('Your request has been sent to the admin.');
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be 5MB or less.');
      e.target.value = '';
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${currentUser.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
      setAvatarUrl(publicUrl);
      await reload();
      toast.success('Photo updated!');
    } catch (err) {
      console.error(err);
      toast.error('Could not upload photo.');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <h2 className="font-heading text-xl font-bold mb-4">Profile</h2>

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-card to-[#7f30cb]/[0.04] dark:to-[#7f30cb]/[0.08] border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <MemberAvatar
              avatar={currentUser?.avatar}
              avatarUrl={avatarUrl || currentUser?.avatar_url}
              color={currentUser?.member_color}
              size="xl"
              name={currentUser?.display_name || currentUser?.full_name}
            />
            <label className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center cursor-pointer">
              <Camera className="w-3 h-3 text-primary-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-lg">{currentUser?.display_name || currentUser?.full_name}</h3>
              {isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
            </div>
            <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  currentUser?.role === 'admin'
                    ? 'bg-[rgba(127,48,203,0.14)] text-[#7f30cb]'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {currentUser?.role}
              </span>
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                {family?.name}
              </span>
            </div>
          </div>
        </div>

        {!editing ? (
          <Button variant="outline" onClick={() => setEditing(true)} className="w-full mt-4 rounded-xl">
            <Settings className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <Label>Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" />
            </div>
            {(avatarUrl || currentUser?.avatar_url) && (
              <button
                type="button"
                onClick={async () => {
                  setAvatarUrl(null);
                  await supabase.from('profiles').update({ avatar_url: null }).eq('id', currentUser.id);
                  await reload();
                  toast.success('Photo removed.');
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-full px-3 py-1.5 hover:border-destructive hover:text-destructive transition-colors w-full justify-center"
              >
                <X className="w-3 h-3" /> Remove current photo
              </button>
            )}
            <div>
              <Label className="mb-2 block">Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {MEMBER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`w-9 h-9 rounded-lg ${color === c.value ? 'ring-2 ring-offset-2 ring-[#2f9db6]' : ''}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveProfile} disabled={saving} className="flex-1 rounded-xl">
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="rounded-xl">Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="bg-gradient-to-br from-card to-[#2f9db6]/[0.04] dark:from-card dark:to-[#2f9db6]/[0.08] border border-border rounded-xl divide-y divide-border overflow-hidden mb-4">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Sun className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Theme</span>
          </div>
          <div className="flex rounded-lg bg-secondary/60 dark:bg-secondary/40 p-0.5 gap-0.5">
            {THEME_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-md text-[10px] font-semibold transition-colors ${
                  theme === value
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowNotifPrefs(!showNotifPrefs)} className="flex items-center justify-between w-full p-4 hover:bg-secondary/50 transition-colors">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Notification Preferences</span>
          </div>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showNotifPrefs ? 'rotate-90' : ''}`} />
        </button>

        {showNotifPrefs && (
          <div className="p-4 space-y-4 bg-secondary/20">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Day-before reminders</Label>
              <Switch checked={prefs.day_before_reminder !== false} onCheckedChange={(v) => toggleNotifPref('day_before_reminder', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Task due reminders</Label>
              <Switch checked={prefs.task_due_reminders !== false} onCheckedChange={(v) => toggleNotifPref('task_due_reminders', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Family alerts</Label>
              <Switch checked={prefs.family_alerts !== false} onCheckedChange={(v) => toggleNotifPref('family_alerts', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Check-in notifications</Label>
              <Switch checked={prefs.checkin_notifications !== false} onCheckedChange={(v) => toggleNotifPref('checkin_notifications', v)} />
            </div>
          </div>
        )}

        {isAdmin && (
          <Link to="/admin" className="flex items-center justify-between w-full p-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Admin Panel</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        )}

        {!isPremium && isAdmin && (
          <Link to="/upgrade" className="flex items-center justify-between w-full p-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-600">Upgrade to Premium</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
        <button onClick={handleLogout} className="flex items-center gap-3 w-full p-4 hover:bg-secondary/50 transition-colors">
          <LogOut className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>

        {isAdmin ? (
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-3 w-full p-4 hover:bg-destructive/5 transition-colors"
          >
            <Trash2 className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">Delete Account</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => { setShowRequestDeleteModal(true); setRequestDeleteConfirmText(''); }}
              className="flex items-center gap-3 w-full p-4 hover:bg-destructive/5 transition-colors"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">Delete Account</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-3 w-full p-4 hover:bg-secondary/50 transition-colors"
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Request to Leave Family</span>
            </button>
          </>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-heading font-bold text-lg text-destructive">Delete Account</h3>
            <p className="text-sm text-muted-foreground">{deleteAccountDescription}</p>
            <p className="text-sm font-medium">Type the word <span className="font-bold text-destructive">&quot;DELETE&quot;</span> below:</p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder=""
              className="h-12 font-mono tracking-widest"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText !== 'DELETE'}
              >
                {deletingAccount ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRequestDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-heading font-bold text-lg text-destructive">Request Account Deletion</h3>
            <p className="text-sm text-muted-foreground">Your request will be sent to the family admin for approval. You will stay in the family until they approve it.</p>
            <p className="text-sm font-medium">Type the word <span className="font-bold text-destructive">&quot;DELETE&quot;</span> below:</p>
            <Input
              value={requestDeleteConfirmText}
              onChange={(e) => setRequestDeleteConfirmText(e.target.value)}
              placeholder=""
              className="h-12 font-mono tracking-widest"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => { setShowRequestDeleteModal(false); setRequestDeleteConfirmText(''); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleRequestDelete}
                disabled={requestDeleteConfirmText !== 'DELETE'}
              >
                Send Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-heading font-bold text-lg">Request to Leave Family?</h3>
            <p className="text-sm text-muted-foreground">Your request will be sent to the family admin for approval. You will stay in the family until they approve it.</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowLeaveModal(false)}
                disabled={sendingLeave}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl"
                disabled={sendingLeave}
                onClick={async () => {
                  setSendingLeave(true);
                  const name = currentUser?.display_name || currentUser?.full_name || 'A member';
                  const admins = members.filter(m => m.role === 'admin');
                  if (admins.length > 0) {
                    await supabase.from('notifications').insert(
                      admins.map(a => ({
                        user_id: a.id,
                        type: 'family_alert',
                        message: `${name} has requested to leave the family.|${currentUser.id}`,
                        read: false,
                      }))
                    );
                  }
                  await supabase.from('feed_items').insert({
                    family_id: family.id,
                    user_id: currentUser.id,
                    user_name: name,
                    user_avatar: currentUser.avatar,
                    type: 'family_alert',
                    message: `${name} has requested to leave the family.`,
                  });
                  setSendingLeave(false);
                  setShowLeaveModal(false);
                  toast.success('Your request has been sent to the admin.');
                }}
              >
                {sendingLeave ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mt-6 space-y-2 pb-2">
        <p className="text-[11px] text-muted-foreground">
          © 2026 Zencora. All Rights Reserved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a
            href="/terms"
            className="text-[11px] text-primary hover:underline"
          >
            Terms of Service
          </a>
          <span className="text-muted-foreground/40 text-[11px]">·</span>
          <a
            href="/privacy"
            className="text-[11px] text-primary hover:underline"
          >
            Privacy Policy
          </a>
        </div>
        <p className="text-[10px] text-muted-foreground/50">
          Our FamilySync · Built by Zencora
        </p>
      </div>
    </div>
  );
}