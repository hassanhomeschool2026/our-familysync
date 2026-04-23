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
  const pushSubKeyRef = useRef(null);

  const reload = async () => {
    if (!user) return;
    setLoading(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const resolvedUser = profile || { id: user.id, email: user.email };
    setCurrentUser(resolvedUser);

    if (profile?.family_id) {
      const { data: familyData } = await supabase
        .from('families')
        .select('*')
        .eq('id', profile.family_id)
        .single();
      setFamily(familyData);

      const { data: membersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_id', profile.family_id);
      setMembers(membersData || []);
    } else {
      setFamily(null);
      setMembers([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      reload();
    } else {
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
