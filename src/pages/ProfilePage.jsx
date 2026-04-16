import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFamily } from '@/lib/familyContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MEMBER_COLORS, AVATARS } from '@/lib/memberColors';
import MemberAvatar from '@/components/shared/MemberAvatar';
import {
  Settings, Shield, LogOut, Crown, Bell, ChevronRight, Trash2,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ProfilePage() {
  const { currentUser, family, members, isAdmin, isPremium, reload } = useFamily();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '😊');
  const [color, setColor] = useState(currentUser?.member_color || MEMBER_COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

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
      .update({ display_name: displayName, avatar, member_color: color })
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
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      if (isAdmin) {
        if (otherMembers.length === 0) {
          await supabase.from('families').delete().eq('id', family.id);
        } else {
          const nextAdmin = otherMembers[0];
          await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', nextAdmin.id);
          toast.info(`${nextAdmin.display_name || nextAdmin.full_name} has been promoted to admin.`);
        }
      }
      await supabase
        .from('profiles')
        .update({ family_id: null, role: 'member' })
        .eq('id', currentUser.id);
      toast.success('Your account has been deleted.');
      await supabase.auth.signOut();
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
      setDeletingAccount(false);
    }
  };

  return (
    <div>
      <h2 className="font-heading text-xl font-bold mb-4">Profile</h2>

      {/* Profile Card */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center gap-4">
          <MemberAvatar avatar={currentUser?.avatar} color={currentUser?.member_color} size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-lg">{currentUser?.display_name || currentUser?.full_name}</h3>
              {isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
            </div>
            <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium capitalize">
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
            <div>
              <Label className="mb-2 block">Avatar</Label>
              <div className="flex flex-wrap gap-1.5">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center ${
                      avatar === a ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {MEMBER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`w-9 h-9 rounded-lg ${color === c.value ? 'ring-2 ring-offset-2 ring-foreground' : ''}`}
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
      <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden mb-4">
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

        {!isPremium && (
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

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center gap-3 w-full p-4 hover:bg-destructive/5 transition-colors">
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">Delete Account</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteAccountDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteAccount();
                }}
                disabled={deletingAccount}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-6">
        Our FamilySync · Built by Zencora
      </p>
    </div>
  );
}