import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { setOneSignalUserId, sendTag } from '../lib/oneSignal';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  }, []);

  const fetchPlan = useCallback(async (userId) => {
    const { data } = await supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', userId)
      .single();
    setUserPlan(data?.plan ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchPlan(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          fetchProfile(session.user.id);
          fetchPlan(session.user.id).then(() => {
            setOneSignalUserId(session.user.id);
          });
        } else {
          setProfile(null);
          setUserPlan(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchPlan]);

  // Tag OneSignal user with plan status when it changes
  useEffect(() => {
    if (session?.user && userPlan !== undefined) {
      sendTag('has_plan', userPlan ? 'true' : 'false');
    }
  }, [session, userPlan]);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isPro: profile?.is_pro ?? false,
    onboardingCompleted: profile?.onboarding_completed ?? false,
    fitnessProfile: profile?.fitness_profile ?? null,
    userPlan,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile: () => session?.user && fetchProfile(session.user.id),
    refreshPlan: () => session?.user && fetchPlan(session.user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
