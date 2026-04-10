import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, AuthError } from '@supabase/supabase-js';

type Profile = any;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error }: { data: { session: any }, error: any }) => {
      if (error) {
        console.error('Session error:', error);
      }
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        // Don't throw - profile might not exist yet
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (err: any) {
      console.error('Sign in error:', err);
      return { error: err };
    }
  }

  async function signUp(email: string, password: string, username: string, fullName: string): Promise<{ error: AuthError | null }> {
    try {
      // Step 1: Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName
          }
        }
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        return { error: signUpError };
      }

      if (!authData.user) {
        return { error: { message: 'User creation failed' } as AuthError };
      }

      // If the user is auto-signed in, update local state.
      if (authData.session?.user) {
        setUser(authData.session.user);
        fetchProfile(authData.session.user.id);
      }

      // Step 2: Create profile (this might fail if table doesn't exist)
      try {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          username,
          full_name: fullName,
          points: 0,
          streak_days: 0,
        });

        if (profileError) {
          console.warn('Profile creation error (table may not exist):', profileError);
          // Don't fail signup if profile creation fails - user can still log in
        }
      } catch (profileErr) {
        console.warn('Profile creation exception:', profileErr);
        // Continue - profile can be created later
      }

      return { error: null };
    } catch (err: any) {
      console.error('Sign up exception:', err);
      return { error: err };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id);
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
