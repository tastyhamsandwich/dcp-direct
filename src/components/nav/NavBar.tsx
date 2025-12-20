'use client';

import React, { useEffect, useState } from 'react';
import NavLinks from './NavLinks';
import NavRight from './NavRight';
import './navstyles.css';

/**
 * Renders the site navigation bar with left-aligned links and right-aligned
 * authentication controls. The component waits for the client to mount before
 * rendering to avoid server/client HTML mismatches during hydration.
 *
 * @returns {JSX.Element | null} The navigation layout once mounted.
 * @example
 * <NavBar />
 */
const NavBar: React.FC = () => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="container-container" aria-hidden>
        <div className="left-container">
          <div className="navbar-container">
            <nav className="navbar">
              <ul className="flex gap-4">
                <li className="nav-item">
                  <div className="h-4 w-14 rounded-md bg-slate-600" />
                </li>
                <li className="nav-item">
                  <div className="h-4 w-16 rounded-md bg-slate-600" />
                </li>
              </ul>
            </nav>
          </div>
        </div>
        <div className="right-container">
          <div className="loading-indicator flex items-center bg-[#333] p-3 rounded-lg shadow-md">
            <div className="animate-spin h-4 w-4 border-2 border-[#4caf50] border-t-transparent rounded-full mr-2" />
            <span className="text-gray-200 text-sm">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-container">
      <div className="left-container">
        <NavLinks />
      </div>
      <div className="right-container">
        <NavRight />
      </div>
    </div>
  );
};

export default NavBar;
