'use client';

import React, { useEffect, useState } from 'react';
import NavProfile from './NavProfile';
import NavLogin from './NavLogin';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@contexts/authContext';

export default function NavRight() {
  const { user, profile, loading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Add a timeout to show a different message if loading takes too long
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;

    if (loading) {
      // Show extended message after 5 seconds
      timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000);

      // After 10 seconds of loading, show fallback UI
      fallbackTimer = setTimeout(() => {
        setShowFallback(true);
      }, 10000);
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
    if (user && profile && !loading && pathname === '/') {
      console.log('User logged in, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [user, profile, loading, pathname, router]);

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

  // If we've been loading too long, show a fallback UI that allows interaction
  if (showFallback && loading) {
    return (
      <div className="nav-right pt-3 pr-8 pb-2">
        <div className="flex flex-col items-center bg-[#333] p-3 rounded-lg shadow-md">
          <div className="text-gray-200 text-sm mb-2">
            Authentication is taking longer than expected
          </div>
          {user && profile ? <NavProfile /> : <NavLogin />}
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
        <NavProfile />
      ) : (
        <NavLogin />
      )}
    </div>
  );
}
