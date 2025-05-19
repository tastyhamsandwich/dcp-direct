'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getUserById, validateUser, updateUser, type User } from '@db/database';
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
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  // Fetch the profile data for a user
  const fetchProfile = async (userId: string) => {
    try {

      if (userId === undefined) {
        console.log(`User ID is undefined`);
        console.error('User ID is undefined');
        setError('User ID is undefined');
        return null;
      }
      console.log(`DEBUG: ${userId}`);

      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userId),
      });

      console.log(`Sent API call to fetch profile for userId: ${userId}`);
      const result = await res.json() as { data: Profile | null; error?: string };

      if (result.error) {
        console.log(`Failed to fetch profile from API call`);
        console.error('Error fetching profile: ', result.error);
        setError(result.error);
        return null;
      }

      return result.data as Profile;
    } catch (err) {
      if (err instanceof Error) {
        console.error('Error in fetchProfile: ', err.message);
        setError(`Failed to fetch profile (${err.message})`);
        return null;
      }
    }
  };

  // Refresh the user's profile data
  const refreshProfile = async () => {
    if (!user || !user.id) return;
    
    setLoading(true);
    try {
      const profileData = await fetchProfile(user.id!);
      if (profileData) {
        setUser(profileData);
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
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: updates.id, ...updates }),
      });
      const result = await res.json() as { success: boolean; error?: string };

      if (!result.success && result.error) {
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

    const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password
        }),
      });
      
      if (!res.ok) {
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }
      
      const { user, session } = await res.json() as { user: User; session: Session };
      setUser(user);
      setSession(session);
            
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
    });

    if (!validatedFields.success)
      return { errors: validatedFields.error.flatten().fieldErrors }

    // Send registration data to server-side API
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedFields.data),
    });

    type RegisterResponse = {
      success: boolean;
      user?: { id: string; role: string };
      errors?: { email?: string[]; username?: string[]; password?: string[]; confirmPassword?: string[]; dob?: string[] };
      error?: string;
      session?: Session;
    };
    const result = (await res.json()) as RegisterResponse;

    if (!result.success) {
      return { errors: result.errors || { email: [result.error || "Registration failed"] } };
    }

    if (!result.session || !result.user) {
      return { errors: { email: ["Could not create session or user."] } };
    }

    setUser(result.user);
    setSession(result.session);

    redirect("/dashboard");
  };

  // Sign out
  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });

      // Clear user data from state
      setUser(null);
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
          console.log(`Session not found!`);
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
        }
        const { user, session } = await res.json() as { user: User; session: Session };

        console.log(`Session found!`);
        if (user) setUser(user);
        if (session) setSession(session);

      /*} catch (err) {
        if (err instanceof Error) {
          console.error('Error initializing authentication:', err);
          setError(`Failed to initialize authentication: ${err.message}`);
        }*/
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  // Sign in with OAuth provider
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