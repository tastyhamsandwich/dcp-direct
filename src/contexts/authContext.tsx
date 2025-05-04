'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { createClient } from '@supabaseC';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Define the profile type based on the data we need
export interface Profile {
  id: string;
  username: string;
  balance: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'discord') => Promise<void>;
  signUp: (email: string, password: string, username: string, /* dob: string (REMOVED DOB FOR NOW) */ ) => Promise<void>;
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
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  // Fetch the profile data for a user
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setError(error.message);
        return null;
      }

      return data as Profile;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setError('Failed to fetch profile');
      return null;
    }
  };

  // Refresh the user's profile data
  const refreshProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const profileData = await fetchProfile(user.id);
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
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        setError(error.message);
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSession(data.session);
      setUser(data.user);
      
      if (data.user) {
        const profileData = await fetchProfile(data.user.id);
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
  const signUp = async (email: string, password: string, username: string, /* dob: string REMOVED TEMPORARILY */ ) => {
    setLoading(true);
    setError(null);
    
    try {
      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            /* dob, REMOVED TEMPORARILY */
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // If user creation was successful, create the profile
      if (authData.user) {
        // Initialize a profile with default values
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            username,
            balance: 1000, // Default starting balance
            avatar_url: null, // Default no avatar
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          setError('Account created but profile setup failed');
          return;
        }

        setUser(authData.user);
        setSession(authData.session);
        
        // Fetch the newly created profile
        const profileData = await fetchProfile(authData.user.id);
        if (profileData) {
          setProfile(profileData);
        }
        
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Error signing up:', err);
      setError('Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {

      console.log(`Attempting to sign out of Supabase...`);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        setError(error.message);
        return;
      }
      
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
        // Check for existing session - this is faster than waiting for onAuthStateChange
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setLoading(false);
          return;
        }
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Keep loading true until we get the profile
          // Fetch profile data
          if (currentSession.user) {
            const profileData = await fetchProfile(currentSession.user.id);
            if (profileData) {
              setProfile(profileData);
            } else {
              // If the user has signed in with OAuth but doesn't have a profile yet, create one
              if (currentSession.user.app_metadata.provider === 'discord') {
                try {
                  // Get user details from OAuth provider
                  const username = currentSession.user.user_metadata.full_name || 
                                  currentSession.user.user_metadata.name || 
                                  `User-${currentSession.user.id.substring(0, 6)}`;
                  
                  // Initialize a profile with default values
                  const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                      id: currentSession.user.id,
                      username,
                      balance: 1000, // Default starting balance
                      avatar_url: currentSession.user.user_metadata.avatar_url || null,
                    });
                  
                  if (profileError) {
                    console.error('Error creating profile for OAuth user:', profileError);
                  } else {
                    // Fetch the newly created profile
                    const newProfileData = await fetchProfile(currentSession.user.id);
                    if (newProfileData) {
                      setProfile(newProfileData);
                    }
                  }
                } catch (err) {
                  console.error('Error creating profile for OAuth user:', err);
                }
              }
            }
            // Now that we have both user and profile, we can stop loading
            setLoading(false);
          } else {
            setLoading(false);
          }
        } else {
          // If no session, we can immediately show unauthenticated state
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError('Failed to initialize authentication');
        setLoading(false);
      }
    };

    // Initialize auth state immediately
    initializeAuth();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event, newSession);
      
      // Immediately update session and user state
      setSession(newSession);
      setUser(newSession?.user || null);
      
      // Handle login events (including OAuth signin completions)
      if (event === 'SIGNED_IN' && newSession?.user) {
        // Fetch profile data
        const profileData = await fetchProfile(newSession.user.id);
        
        if (profileData) {
          setProfile(profileData);
        } else if (newSession.user.app_metadata.provider === 'discord') {
          // Create a profile for an OAuth user if they don't have one yet
          try {
            // Get user details from OAuth provider
            const username = newSession.user.user_metadata.full_name || 
                            newSession.user.user_metadata.name || 
                            `User-${newSession.user.id.substring(0, 6)}`;
            
            // Initialize a profile with default values
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: newSession.user.id,
                username,
                balance: 1000, // Default starting balance
                avatar_url: newSession.user.user_metadata.avatar_url || null,
              });
            
            if (profileError) {
              console.error('Error creating profile for OAuth user:', profileError);
            } else {
              // Fetch the newly created profile
              const newProfileData = await fetchProfile(newSession.user.id);
              if (newProfileData) {
                setProfile(newProfileData);
              }
            }
          } catch (err) {
            console.error('Error creating profile for OAuth user:', err);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
      
      // Clear loading state 
      setLoading(false);
    });

    // Clean up listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* Dependency array intentionally empty - only run on mount */]);

  // Sign in with OAuth provider
  const signInWithOAuth = async (provider: 'discord') => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      // OAuth flow continues in the browser with a redirect
      // We'll handle the callback in the useEffect with onAuthStateChange
    } catch (err) {
      console.error('Error signing in with OAuth:', err);
      setError('Failed to sign in with OAuth');
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