import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { supabase } from '../lib/supabase';
import { forceRelinkViaAPI, sendTag } from '../lib/oneSignal';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Track the last user id we've fetched for, so getSession() and
  // onAuthStateChange (which both fire on initial load) don't double-fetch.
  // Using the user id (not a boolean) so sign-out → sign-in as a different
  // user correctly triggers a fresh fetch.
  const lastFetchedUserIdRef = useRef(null);

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

  const hydrateUser = useCallback(
    (userId) => {
      if (lastFetchedUserIdRef.current === userId) return;
      lastFetchedUserIdRef.current = userId;
      fetchProfile(userId);
      fetchPlan(userId);
      forceRelinkViaAPI(userId);
    },
    [fetchProfile, fetchPlan],
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) hydrateUser(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          hydrateUser(session.user.id);
        } else {
          lastFetchedUserIdRef.current = null;
          setProfile(null);
          setUserPlan(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [hydrateUser]);

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

  const refreshProfile = useCallback(() => {
    const userId = session?.user?.id;
    if (userId) return fetchProfile(userId);
  }, [session, fetchProfile]);

  const refreshPlan = useCallback(() => {
    const userId = session?.user?.id;
    if (userId) return fetchPlan(userId);
  }, [session, fetchPlan]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isPro: profile?.is_pro ?? false,
      displayName: profile?.display_name ?? null,
      onboardingCompleted: profile?.onboarding_completed ?? false,
      fitnessProfile: profile?.fitness_profile ?? null,
      userPlan,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      refreshPlan,
    }),
    [
      session,
      profile,
      userPlan,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      refreshPlan,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
