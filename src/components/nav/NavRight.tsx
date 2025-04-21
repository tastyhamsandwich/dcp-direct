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

  // Add a timeout to show a different message if loading takes too long
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;

    if (loading) {
      // Show extended message after 2 seconds instead of 5
      timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 2000);

      // After 3 seconds of loading, show fallback UI instead of 10
      fallbackTimer = setTimeout(() => {
        setShowFallback(true);
      }, 3000);
    } else {
      setLoadingTimeout(false);
      setShowFallback(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
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
