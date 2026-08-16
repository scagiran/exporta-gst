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
      // Deliberately NOT maybeSingle(): a user with more than one membership row
      // would make it return null, which used to be misread as "no organization"
      // and silently spawned yet another empty org on every page load.
      const { data: memberRows, error: memberErr } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', userId);

      if (memberErr) {
        // A failed lookup is not proof that the user has no organization —
        // creating one here would orphan the existing data.
        console.error('[ExPorta] org_members okunamadı:', memberErr.message, memberErr);
        return;
      }

      if (memberRows && memberRows.length > 0) {
        if (memberRows.length > 1) {
          console.warn(
            `[ExPorta] Bu kullanıcı ${memberRows.length} organizasyona üye. İlki kullanılıyor:`,
            memberRows[0].org_id
          );
        }

        const orgId = memberRows[0].org_id;
        const { data: orgRow, error: orgErr } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', orgId)
          .maybeSingle();

        if (orgErr) {
          console.error('[ExPorta] organizations okunamadı:', orgErr.message, orgErr);
        }

        // Even if the name cannot be read, the membership proves the org exists —
        // keep working with the id rather than creating a replacement.
        setOrganization({ id: orgId, name: orgRow?.name || 'Organizasyonum' });
        return;
      }

      // 2. Genuinely no membership row: this is a first-time user, create their org.
      // Done through an RPC so the organization row and the owner membership are
      // written atomically. Doing it from the client used to leave orphan orgs:
      // the insert committed, but reading the row back was blocked by the SELECT
      // policy (which requires a membership that did not exist yet), so the
      // membership insert never ran.
      const defaultOrgName = userEmail ? `${userEmail.split('@')[0].toUpperCase()} İhracat` : 'İhracat Firmam';

      const { data: newOrgId, error: createOrgErr } = await supabase.rpc(
        'create_org_for_current_user',
        { org_name: defaultOrgName }
      );

      if (createOrgErr || !newOrgId) {
        console.error('[ExPorta] Organizasyon oluşturulamadı:', createOrgErr?.message, createOrgErr);
        return;
      }

      setOrganization({ id: newOrgId as string, name: defaultOrgName });
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

    // Without an active session the RPC below cannot run (auth.uid() is null).
    // That happens when e-mail confirmation is switched on for the project.
    if (!data.session) {
      setLoading(false);
      return {
        error: new Error(
          'Hesabınız oluşturuldu, ancak e-posta doğrulaması bekleniyor. Doğruladıktan sonra giriş yapın.'
        ),
      };
    }

    const orgName = companyName || 'İhracat Şirketim';
    const { data: newOrgId, error: orgError } = await supabase.rpc(
      'create_org_for_current_user',
      { org_name: orgName }
    );

    if (orgError || !newOrgId) {
      console.error('[ExPorta] Kayıt sırasında organizasyon oluşturulamadı:', orgError?.message, orgError);
      setLoading(false);
      return {
        error: new Error(
          `Hesabınız oluşturuldu ancak şirket kaydınız açılamadı: ${orgError?.message || 'bilinmeyen hata'}`
        ),
      };
    }

    setOrganization({ id: newOrgId as string, name: orgName });
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
