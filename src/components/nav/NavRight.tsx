'use client';

import React, { useEffect, useState } from 'react';
import NavProfile from './NavProfile';
import NavLogin from './NavLogin';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@contexts/authContext';

export default function NavRight() {
  const { user, profile, loading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState<boolean>(false);
  const [showFallback, setShowFallback] = useState<boolean>(false);
  const [loginClicked, setLoginClicked] = useState<boolean>(false); // Ensure this is a state variable
  const router = useRouter();
  const pathname = usePathname();

  // Simplify timeout handling to be more resilient
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    // Set a single timeout - after 1.5 seconds of loading, 
    // we'll force the UI to show the appropriate login/profile component
    if (loading) {
      timer = setTimeout(() => {
        setLoadingTimeout(true);
        setShowFallback(true);
      }, 1500);
    } else {
      // Immediately reset states when loading is done
      setLoadingTimeout(false);
      setShowFallback(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading]);

  // Redirect to dashboard when user logs in
  useEffect(() => {
    if (loginClicked && user && profile && !loading && pathname === '/') {
      console.log('User logged in, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [loginClicked, user, profile, loading, pathname, router]);

  // Add an effect to log authentication state changes for debugging
  useEffect(() => {
    console.log('NavRight auth state:', {
      user: user?.id || null,
      profile: profile?.username || null,
      loading,
      pathname,
      timestamp: new Date().toISOString(),
    });
  }, [user, profile, loading, pathname]);

  const handleLoginClicked = () => {
    setLoginClicked(true);
  }
  
  const handleProfileLoad = () => {
    setLoginClicked(false);
  }

  // If we've been loading too long, show login/profile components directly
  // This ensures users can interact with the UI even if auth is still technically loading
  if (showFallback) {
    return (
      <div className="nav-right pt-3 pr-8 pb-2">
        <div className="flex flex-col items-center">
          {user && profile ? <NavProfile onProfileLoad={handleProfileLoad} /> : <NavLogin loginClicked={loginClicked} onLoginClicked={handleLoginClicked} />}
        </div>
      </div>
    );
  }

  return (
    <div className="nav-right pt-3 pr-8 pb-2">
      {loading ? (
        <div className="loading-indicator flex flex-col items-center bg-[#333] p-3 rounded-lg shadow-md pt-5 pr-5">
          {loadingTimeout ? (
            <>
              <div className="text-gray-200 text-sm">
                Still trying to connect...
              </div>
              <div className="text-gray-400 text-xs mt-1">
                Authentication is taking longer than expected
              </div>
            </>
          ) : (
            <div className="text-gray-200 text-sm flex items-center">
              <div className="animate-spin h-4 w-4 border-2 border-[#4caf50] border-t-transparent rounded-full mr-2"></div>
              Loading authentication...
            </div>
          )}
        </div>
      ) : user && profile ? (
        <NavProfile onProfileLoad={handleProfileLoad} />
      ) : (
        <NavLogin loginClicked={loginClicked} onLoginClicked={handleLoginClicked} />
      )}
    </div>
  );
}
