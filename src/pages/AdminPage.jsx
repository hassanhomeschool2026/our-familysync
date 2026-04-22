import React, { useState, useEffect } from 'react';
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
  Copy, RefreshCw, Megaphone, Trash2, ArrowLeft, Check, Share2, MessageSquare,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';

const sectionHeaderBarStyle = {
  background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
  boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
  padding: '12px 16px',
};

const sectionHeaderOverlayStyle = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
};

const GRADIENT_HEADER_STAR_TWINKLE_CSS = `
@keyframes starTwinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
`;

const GRADIENT_HEADER_STARS = [
  { left: '5%', top: '25%', size: 1.8, delay: '0s', dur: '2.2s' },
  { left: '12%', top: '65%', size: 1.4, delay: '0.6s', dur: '3s' },
  { left: '22%', top: '30%', size: 2.2, delay: '1.1s', dur: '2.5s' },
  { left: '33%', top: '70%', size: 1.4, delay: '0.3s', dur: '2.8s' },
  { left: '45%', top: '20%', size: 1.8, delay: '1.5s', dur: '2s' },
  { left: '56%', top: '68%', size: 1.4, delay: '0.8s', dur: '3.2s' },
  { left: '66%', top: '28%', size: 2, delay: '0.4s', dur: '2.4s' },
  { left: '76%', top: '72%', size: 1.4, delay: '1.3s', dur: '2.7s' },
  { left: '86%', top: '35%', size: 2.2, delay: '0.2s', dur: '2.1s' },
  { left: '94%', top: '68%', size: 1.4, delay: '1.8s', dur: '3.1s' },
];

function GradientHeaderStarField() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        borderRadius: 'inherit',
        zIndex: 0,
      }}
    >
      {GRADIENT_HEADER_STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: '50%',
            background: 'white',
            animation: `starTwinkle ${s.dur} ease-in-out infinite`,
            animationDelay: s.delay,
            boxShadow: `0 0 ${s.size * 2}px rgba(255,255,255,0.8)`,
          }}
        />
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { family, setFamily, members, setMembers, currentUser, isAdmin, reload } = useFamily();
  const navigate = useNavigate();
  const [alertMessage, setAlertMessage] = useState('');
  const [sendingAlert, setSendingAlert] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [deleteRequests, setDeleteRequests] = useState([]);

  useEffect(() => {
    if (!family?.id) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('type', 'family_alert')
      .ilike('message', '%requested to leave%')
      .eq('read', false)
      .then(({ data }) => setLeaveRequests(data || []));
    supabase
      .from('notifications')
      .select('*')
      .eq('type', 'family_alert')
      .ilike('message', '%requested to delete%')
      .eq('read', false)
      .then(({ data }) => setDeleteRequests(data || []));
  }, [family?.id]);

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
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Settings
      </button>
      <div
        className="relative mb-4 overflow-hidden rounded-xl"
        style={sectionHeaderBarStyle}
      >
        <GradientHeaderStarField />
        <style>{GRADIENT_HEADER_STAR_TWINKLE_CSS}</style>
        <div
          className="pointer-events-none absolute inset-0"
          style={sectionHeaderOverlayStyle}
          aria-hidden
        />
        <h2 className="relative z-[1] font-heading text-xl font-bold text-white">Admin Panel</h2>
      </div>

      {/* Invite Code */}
      <div className="bg-gradient-to-br from-card to-[#2f9db6]/[0.06] border border-border rounded-xl p-4 mb-4">
        <div
          className="relative mb-2 overflow-hidden rounded-xl"
          style={sectionHeaderBarStyle}
        >
          <GradientHeaderStarField />
          <div
            className="pointer-events-none absolute inset-0"
            style={sectionHeaderOverlayStyle}
            aria-hidden
          />
          <p className="relative z-[1] text-xs font-semibold uppercase tracking-wide text-white">
            Family Invite Code
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-secondary rounded-lg px-4 py-3 font-mono text-xl text-center tracking-[0.4em] font-bold">
            {family?.invite_code}
          </div>
          <Button size="icon" variant="outline" onClick={copyCode} className="h-12 w-12 rounded-xl">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <Button
          size="sm"
          className="mt-2 text-xs rounded-full flex items-center gap-1.5"
          onClick={() => setShowShareModal(true)}
        >
          <Share2 className="w-3.5 h-3.5" />
          Share Invite
        </Button>
        <Button variant="ghost" size="sm" onClick={regenerateCode} className="mt-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3 mr-1" /> Regenerate Code
        </Button>
      </div>

      {/* Send Family Alert */}
      <div className="bg-gradient-to-br from-card to-[#7f30cb]/[0.05] border border-border rounded-xl p-4 mb-4">
        <div
          className="relative mb-2 overflow-hidden rounded-xl"
          style={sectionHeaderBarStyle}
        >
          <GradientHeaderStarField />
          <div
            className="pointer-events-none absolute inset-0"
            style={sectionHeaderOverlayStyle}
            aria-hidden
          />
          <p className="relative z-[1] text-xs font-semibold uppercase tracking-wide text-white">
            Send Family Alert
          </p>
        </div>
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
      <div className="bg-gradient-to-br from-card to-[#2f9db6]/[0.04] border border-border rounded-xl overflow-hidden">
        <div
          className="relative overflow-hidden"
          style={sectionHeaderBarStyle}
        >
          <GradientHeaderStarField />
          <div
            className="pointer-events-none absolute inset-0"
            style={sectionHeaderOverlayStyle}
            aria-hidden
          />
          <p className="relative z-[1] text-xs font-semibold uppercase tracking-wide text-white flex items-center gap-2 flex-wrap">
            <span>Household Members</span>
            <span className="text-[10px] font-semibold text-white bg-[rgba(255,255,255,0.2)] px-2 py-0.5 rounded-full tabular-nums">
              {members.length}
            </span>
          </p>
        </div>
        <div className="divide-y divide-border">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-4">
              <MemberAvatar
                avatar={member.avatar}
                avatarUrl={member?.avatar_url}
                color={member.member_color}
                size="sm"
                name={member.display_name || member.full_name}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{member.display_name || member.full_name}</p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${
                      member.role === 'admin'
                        ? 'bg-[rgba(127,48,203,0.14)] text-[#7f30cb]'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Joined {format(new Date(member.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex items-center gap-1">
                  {member.role !== 'admin' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                      onClick={async () => {
                        await supabase.from('profiles').update({ role: 'admin' }).eq('id', member.id);
                        toast.success(`${member.display_name || member.full_name} is now an admin`);
                        reload();
                      }}
                    >
                      Make Admin
                    </Button>
                  )}
                  {member.role === 'admin' && member.id !== currentUser.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                      onClick={async () => {
                        await supabase.from('profiles').update({ role: 'member' }).eq('id', member.id);
                        toast.success(`${member.display_name || member.full_name} is now a member`);
                        reload();
                      }}
                    >
                      Make Member
                    </Button>
                  )}
                </div>
                {member.id !== currentUser.id && (
                  <button
                    type="button"
                    onClick={() => setRemovingMember(member)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {leaveRequests.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Leave Requests ({leaveRequests.length})
          </p>
          <div className="space-y-3">
            {leaveRequests.map((req) => {
              const parts = req.message?.split('|');
              const requesterId = parts?.[1]?.trim();
              const member = members.find(m => m.id === requesterId);
              const name = member?.display_name || member?.full_name || 'A member';
              if (!requesterId) return null;
              return (
                <div key={req.id} className="flex items-center justify-between gap-2">
                  <p className="text-sm">{name} wants to leave the family</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={async () => {
                        await supabase.from('notifications').update({ read: true }).eq('id', req.id);
                        setLeaveRequests(prev => prev.filter(r => r.id !== req.id));
                        toast.success('Request denied.');
                      }}
                    >
                      Deny
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={async () => {
                        await supabase.from('profiles').update({ family_id: null, role: 'member' }).eq('id', requesterId);
                        await supabase.from('notifications').update({ read: true }).eq('id', req.id);
                        await supabase.from('feed_items').insert({
                          family_id: family.id,
                          user_id: currentUser.id,
                          user_name: currentUser.display_name || currentUser.full_name,
                          user_avatar: currentUser.avatar,
                          type: 'family_alert',
                          message: `${name} has left the family.`,
                        });
                        setLeaveRequests(prev => prev.filter(r => r.id !== req.id));
                        setMembers(members.filter(m => m.id !== requesterId));
                        toast.success(`${name} has been removed.`);
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {deleteRequests.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 mt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Account Deletion Requests ({deleteRequests.length})
          </p>
          <div className="space-y-3">
            {deleteRequests.map((req) => {
              const parts = req.message?.split('|');
              const requesterId = parts?.[1]?.trim();
              const member = members.find(m => m.id === requesterId);
              const name = member?.display_name || member?.full_name || 'A member';
              if (!requesterId) return null;
              return (
                <div key={req.id} className="flex items-center justify-between gap-2">
                  <p className="text-sm">{name} wants to delete their account</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={async () => {
                        await supabase.from('notifications').update({ read: true }).eq('id', req.id);
                        setDeleteRequests(prev => prev.filter(r => r.id !== req.id));
                        toast.success('Request denied.');
                      }}
                    >
                      Deny
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        await supabase.from('profiles').update({ family_id: null, role: 'member' }).eq('id', requesterId);
                        await supabase.from('notifications').update({ read: true }).eq('id', req.id);
                        await supabase.from('feed_items').insert({
                          family_id: family.id,
                          user_id: currentUser.id,
                          user_name: currentUser.display_name || currentUser.full_name,
                          user_avatar: currentUser.avatar,
                          type: 'family_alert',
                          message: `${name}'s account has been removed by admin.`,
                        });
                        setDeleteRequests(prev => prev.filter(r => r.id !== req.id));
                        setMembers(members.filter(m => m.id !== requesterId));
                        toast.success(`${name} has been removed.`);
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-heading font-bold text-lg">Invite to Our FamilySync</h3>
            <p className="text-sm text-muted-foreground">Share this message with your family member:</p>
            <div className="bg-secondary rounded-xl p-4 text-sm text-foreground">
              Hey! I&apos;m inviting you to join our family on Our FamilySync. Download the app at app.familysync.zencora.org and use invite code:{' '}
              <span className="font-bold tracking-widest">{family?.invite_code}</span>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 rounded-xl"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`Hey! I'm inviting you to join our family on Our FamilySync. Download the app at app.familysync.zencora.org and use invite code: ${family?.invite_code}`);
                  toast.success('Message copied!');
                }}
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy Message
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={() => {
                  const msg = encodeURIComponent(`Hey! I'm inviting you to join our family on Our FamilySync. Download the app at app.familysync.zencora.org and use invite code: ${family?.invite_code}`);
                  window.open(`sms:?body=${msg}`);
                }}
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                Send via SMS
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}