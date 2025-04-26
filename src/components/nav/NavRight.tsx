'use client';

import React, { useEffect, useState } from 'react';
import NavProfile from './NavProfile';
import NavLogin from './NavLogin';
import './navstyles.css';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@contexts/authContext';

export default function NavRight() {
  const { user, profile, loading } = useAuth();
  const [loginClicked, setLoginClicked] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  // Only redirect on successful login
  useEffect(() => {
    if (loginClicked && user && profile && !loading && pathname === '/') {
      setLoginClicked(false); // Reset immediately to prevent multiple redirects
      router.push('/dashboard');
    }
  }, [user, profile, loading, pathname, router, loginClicked]);

  const handleLoginClicked = () => {
    setLoginClicked(true);
  }

  return (
    <div className="nav-right pt-3 pb-2">
      {loading ? (
        <div className="loading-indicator flex items-center bg-[#333] p-3 rounded-lg shadow-md">
          <div className="animate-spin h-4 w-4 border-2 border-[#4caf50] border-t-transparent rounded-full mr-2"></div>
          <span className="text-gray-200 text-sm">Loading...</span>
        </div>
      ) : user && profile ? (
        <NavProfile />
      ) : (
        <NavLogin onLoginClicked={handleLoginClicked} />
      )}
    </div>
  );
}
