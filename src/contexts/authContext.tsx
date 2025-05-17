'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createUser, getUserById, validateUser, updateUser, type User } from '@db/database';
import { createSession, verifySession, deleteSession, type Session } from '@lib/session';
import { registerSchema, loginSchema, FormState } from "@lib/zod";
import { redirect } from 'next/navigation';

// Define the profile type based on the data we need
export interface Profile extends User {
  id: string;
  username: string;
  balance: number;
  avatar?: string;
  created?: Date;
  lastUpdated?: Date;
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: "discord") => Promise<void>;
  signUp: (
    state: FormState,
    formData: FormData
  ) => Promise<void | {
    errors: {
      email?: string[];
      username?: string[];
      password?: string[];
      confirmPassword?: string[];
      dob?: string[];
    };
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
	user: null,
	profile: null,
	session: null,
	loading: false,
	error: null,
	signIn: async () => {},
	signInWithOAuth: async () => {},
	signUp: async () => {},
	signOut: async () => {},
	refreshProfile: async () => {},
	updateProfile: async () => {},
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
// TODO Ensure that all of provider component is updated to stop using Supabase
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  // Fetch the profile data for a user
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await getUserById(userId);

      if (error) {
        console.error('Error fetching profile:', error);
        setError(error.message);
        return null;
      }

      return data as Profile;
    } catch (err) {
      if (err instanceof Error) {
        console.error('Error in fetchProfile:', err);
        setError('Failed to fetch profile');
        return null;
      }
    }
  };

  // Refresh the user's profile data
  const refreshProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const profileData = await fetchProfile(user.id!);
      if (profileData) {
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setError('Failed to refresh profile');
    } finally {
      setLoading(false);
    }
  };

  // Update the user's profile
  const updateProfile = async (updates: Partial<User>) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      const result = await updateUser(updates.id!, updates);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Refresh the profile after update
      await refreshProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await validateUser(email, password);

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: result.user.id,
          role: result.user.role,
        }),
      });
      
      const res = await fetch("/api/auth/session");

      if (!res.ok) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      const { user, session } = await res.json() as { user: User; session: Session };
      setUser(user);
      setSession(session);
      
      if (user && user.id) {
        const profileData = await fetchProfile(user.id);
        if (profileData) {
          setProfile(profileData);
        }
      }
      
      router.push('/dashboard');
    } catch (err) {
      console.error('Error signing in:', err);
      setError('Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (state: FormState, formData: FormData): 
  Promise<void | { errors: { email?: string[], username?: string[], password?: string[], confirmPassword?: string[], dob?: string[] }}> => {
    const validatedFields = registerSchema.safeParse({
      email: formData.get("email") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
      dob: formData.get("dob") as string,
    });
  
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
  
    const { username, email, password } = validatedFields.data;
  
    const result = await createUser({ username, email, password });

    if (result.success) {
      if (result.user.id && result.user.role) {
        // Create session via API endpoint (server-side only)
        await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: result.user.id,
            role: result.user.role,
          }),
        });
      } else throw new Error("User ID or role is undefined");

      redirect("/dashboard");
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });

      // Clear user data from state
      setUser(null);
      setProfile(null);
      setSession(null);
      
      router.push('/');
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out');
    }
  };

  // Effect to handle auth state changes
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);

      try {
        const res: Response = await fetch("/api/auth/session");
        if (!res.ok) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        const { user, session } = await res.json() as { user: User; session: Session };
        setUser(user);
        setSession(session);
        if (user && user.id) {
          const profileData = await fetchProfile(user.id);
          if (profileData) setProfile(profileData);
        }
      } catch (err) {
        setError("Failed to initialize authentication");
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  // Sign in with OAuth provider
  // TODO Rewrite sign in via OAUTH without Supabase
  const signInWithOAuth = async (provider: "discord") => {
    setLoading(true);
    setError(null);

    try {
      window.location.href = `/api/auth/oauth/${provider}`;
      // The backend will handle the redirect to Discord and the callback
      // After successful login, the backend should set the session cookie and redirect to your app
    } catch (err) {
      console.error("Error signing in with OAuth:", err);
      setError("Failed to sign in with OAuth");
      setLoading(false);
    }
  };

  // Auth context value
  const value = {
    user,
    profile,
    session,
    loading,
    error,
    signIn,
    signInWithOAuth,
    signUp,
    signOut,
    refreshProfile,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;