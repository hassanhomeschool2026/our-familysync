import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { DEFAULT_MEMBER_ACCENT } from '@/lib/memberColors';
import { subscribeToPush } from '@/lib/pushNotifications';

const FamilyContext = createContext();

export const FamilyProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [familyLoadError, setFamilyLoadError] = useState('');
  const pushSubKeyRef = useRef(null);

  const reload = async (opts = {}) => {
    const silent = opts.silent === true;
    if (!user) return;
    if (!silent) setLoading(true);
    setFamilyLoadError('');

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const resolvedUser = profile
        ? { ...profile, email: profile.email || user.email }
        : { id: user.id, email: user.email };
      setCurrentUser(resolvedUser);

      if (profile?.family_id) {
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', profile.family_id)
          .maybeSingle();

        if (familyError) throw familyError;
        if (!familyData) {
          throw new Error('Your family record could not be loaded. Please contact the family admin or try again.');
        }
        setFamily(familyData);

        const { data: membersData, error: membersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('family_id', profile.family_id);

        if (membersError) throw membersError;
        setMembers(membersData || []);
      } else {
        setFamily(null);
        setMembers([]);
      }
    } catch (error) {
      console.error('Family reload failed:', error);
      setFamily(null);
      setMembers([]);
      setFamilyLoadError(error?.message || 'Could not load your family. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      reload();
    } else {
      setCurrentUser(null);
      setFamily(null);
      setMembers([]);
      setFamilyLoadError('');
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated) {
      pushSubKeyRef.current = null;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user?.id) return;
    if (!currentUser?.id || !family?.id) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }
    const key = `${currentUser.id}:${family.id}`;
    if (pushSubKeyRef.current === key) return;
    pushSubKeyRef.current = key;
    let cancelled = false;
    (async () => {
      try {
        console.log('Attempting push subscription for', user.id, family.id);
        if (cancelled) return;
        await subscribeToPush(currentUser.id, family.id, supabase);
      } catch (e) {
        console.error('push subscription effect error:', e);
        pushSubKeyRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, user?.id, currentUser?.id, family?.id]);

  const isAdmin = currentUser?.role === 'admin';
  const isPremium = currentUser?.plan === 'premium';

  const getMemberColor = (userId) => {
    const member = members.find(m => m.id === userId);
    return member?.member_color || DEFAULT_MEMBER_ACCENT;
  };

  return (
    <FamilyContext.Provider value={{
      currentUser,
      setCurrentUser,
      family,
      setFamily,
      members,
      setMembers,
      loading,
      familyLoadError,
      isAdmin,
      isPremium,
      getMemberColor,
      reload,
    }}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => useContext(FamilyContext);
