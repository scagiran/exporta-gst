import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Organization {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  organization: Organization | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, pass: string, companyName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshOrg: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch or create user's organization
  const loadUserOrg = async (userId: string, userEmail?: string) => {
    try {
      // 1. Check if user is a member of an existing organization
      const { data: memberData } = await supabase
        .from('org_members')
        .select('org_id, organizations(id, name)')
        .eq('user_id', userId)
        .maybeSingle();

      if (memberData && memberData.organizations) {
        const orgInfo = memberData.organizations as unknown as { id: string; name: string };
        setOrganization({ id: orgInfo.id, name: orgInfo.name });
        return;
      }

      // 2. Fallback: If no organization exists for this user, auto-create one
      const defaultOrgName = userEmail ? `${userEmail.split('@')[0].toUpperCase()} İhracat` : 'İhracat Firmam';
      
      const { data: newOrg, error: createOrgErr } = await supabase
        .from('organizations')
        .insert({ name: defaultOrgName })
        .select()
        .single();

      if (createOrgErr || !newOrg) {
        console.error('Error auto-creating organization:', createOrgErr);
        return;
      }

      // Add user as owner of the newly created organization
      await supabase.from('org_members').insert({
        org_id: newOrg.id,
        user_id: userId,
        role: 'owner',
      });

      setOrganization({ id: newOrg.id, name: newOrg.name });
    } catch (err) {
      console.error('Failed to load or create organization:', err);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserOrg(session.user.id, session.user.email);
      } else {
        setOrganization(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserOrg(session.user.id, session.user.email);
      } else {
        setOrganization(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (!error && data.user) {
      await loadUserOrg(data.user.id, data.user.email);
    }
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, pass: string, companyName: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    if (error || !data.user) {
      setLoading(false);
      return { error: error || new Error('Kullanıcı kaydı başarısız oldu') };
    }

    const userId = data.user.id;

    // Create the organization
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: companyName || 'İhracat Şirketim' })
      .select()
      .single();

    if (!orgError && newOrg) {
      // Add member record
      await supabase.from('org_members').insert({
        org_id: newOrg.id,
        user_id: userId,
        role: 'owner',
      });
      setOrganization({ id: newOrg.id, name: newOrg.name });
    }

    setLoading(false);
    return { error: null };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setOrganization(null);
    setLoading(false);
  };

  const refreshOrg = async () => {
    if (user) {
      await loadUserOrg(user.id, user.email);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        organization,
        loading,
        signIn,
        signUp,
        signOut,
        refreshOrg,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
