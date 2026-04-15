import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFamily } from '@/lib/familyContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { generateInviteCode } from '@/lib/memberColors';
import MemberAvatar from '@/components/shared/MemberAvatar';
import {
  Copy, RefreshCw, Megaphone, Trash2, ArrowLeft, Check,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminPage() {
  const { family, setFamily, members, setMembers, currentUser, isAdmin, reload } = useFamily();
  const navigate = useNavigate();
  const [alertMessage, setAlertMessage] = useState('');
  const [sendingAlert, setSendingAlert] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isAdmin) {
    navigate('/profile');
    return null;
  }

  const copyCode = () => {
    navigator.clipboard.writeText(family?.invite_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Invite code copied!');
  };

  const regenerateCode = async () => {
    const newCode = generateInviteCode();
    await supabase
      .from('families')
      .update({ invite_code: newCode })
      .eq('id', family.id);
    setFamily({ ...family, invite_code: newCode });
    toast.success('New invite code generated!');
  };

  const removeMember = async (memberId) => {
    await supabase
      .from('profiles')
      .update({ family_id: null, role: 'member' })
      .eq('id', memberId);
    setMembers(members.filter(m => m.id !== memberId));
    setRemovingMember(null);
    toast.success('Member removed');
  };

  const sendFamilyAlert = async () => {
    if (!alertMessage.trim()) return;
    setSendingAlert(true);
    const notifications = members
      .filter(m => m.id !== currentUser.id)
      .map(m => ({
        user_id: m.id,
        type: 'family_alert',
        message: alertMessage.trim(),
        read: false,
      }));
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }
    await supabase.from('feed_items').insert({
      family_id: family.id,
      user_id: currentUser.id,
      user_name: currentUser.display_name || currentUser.full_name,
      user_avatar: currentUser.avatar,
      type: 'family_alert',
      message: `📢 Family Alert: ${alertMessage.trim()}`,
    });
    setSendingAlert(false);
    setAlertMessage('');
    toast.success('Alert sent to all members!');
  };

  return (
    <div>
      <button onClick={() => navigate('/profile')} className="flex items-center text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Profile
      </button>
      <h2 className="font-heading text-xl font-bold mb-4">Admin Panel</h2>

      {/* Invite Code */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Family Invite Code</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-secondary rounded-lg px-4 py-3 font-mono text-xl text-center tracking-[0.4em] font-bold">
            {family?.invite_code}
          </div>
          <Button size="icon" variant="outline" onClick={copyCode} className="h-12 w-12 rounded-xl">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={regenerateCode} className="mt-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3 mr-1" /> Regenerate Code
        </Button>
      </div>

      {/* Send Family Alert */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Send Family Alert</p>
        <Textarea
          value={alertMessage}
          onChange={(e) => setAlertMessage(e.target.value)}
          placeholder="Type a message to broadcast to all family members..."
          rows={3}
        />
        <Button
          onClick={sendFamilyAlert}
          disabled={!alertMessage.trim() || sendingAlert}
          className="mt-2 rounded-xl"
          size="sm"
        >
          <Megaphone className="w-4 h-4 mr-1" />
          {sendingAlert ? 'Sending...' : 'Send Alert'}
        </Button>
      </div>

      {/* Members List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide p-4 pb-2">
          Household Members ({members.length})
        </p>
        <div className="divide-y divide-border">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-4">
              <MemberAvatar avatar={member.avatar} color={member.member_color} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{member.display_name || member.full_name}</p>
                  <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full capitalize">{member.role}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Joined {format(new Date(member.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              {member.id !== currentUser.id && (
                <button
                  onClick={() => setRemovingMember(member)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingMember?.display_name || removingMember?.full_name} from the family?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMember(removingMember?.id)}
              className="bg-destructive text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}