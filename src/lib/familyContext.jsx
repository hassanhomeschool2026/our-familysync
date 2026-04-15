import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

const FamilyContext = createContext();

export const FamilyProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const isAdmin = currentUser?.role === 'admin';
  const isPremium = currentUser?.plan === 'premium';

  const getMemberColor = (userId) => {
    const member = members.find(m => m.id === userId);
    return member?.member_color || '#6366f1';
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
