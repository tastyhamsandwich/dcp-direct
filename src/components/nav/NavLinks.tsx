'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@contexts/authContext';
import './navstyles.css';


const NavLinks = () => {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  
  const links = [
    { path: '/', name: 'Home', protected: false, hideWhenLoggedIn: false, icon: `HomeIcon` },
    { path: '/game', name: 'Play', protected: true, hideWhenLoggedIn: false, icon: 'Dices' },
    { path: '/dashboard', name: 'Dashboard', protected: true, hideWhenLoggedIn: false, icon: 'LayoutPanelLeft' },
    { path: '/help', name: 'Help', protected: false, hideWhenLoggedIn: false, icon: 'CircleHelp' },
    { path: '/login', name: 'Login', protected: false, hideWhenLoggedIn: true, icon: 'LogIn' },
    { path: '/register', name: 'Register', protected: false, hideWhenLoggedIn: true, icon: 'UserRoundPlus' },
    { path: '/logout', name: 'Logout', protected: true, hideWhenLoggedIn: false, icon: 'LogOut' },
  ].map((item) => {
    // Skip items that should be hidden when logged in
    if (item.hideWhenLoggedIn && isLoggedIn) {
      return null;
    }

    // Show the item if it's not protected or if the user is logged in and it is protected
    if (!item.protected || (isLoggedIn && item.protected)) {
      return (
        <li className="nav-item" key={item.name}>
          <Link href={item.path} className="rounded-lg px-3 py-2 text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900">
            {item.name}
          </Link>
        </li>
      );
    }
    
    return null;
  });   

  return (
    <div className='navbar-container'>
      <nav className="navbar">
        <ul className="flex gap-4">
          {links}
        </ul>
      </nav>
    </div>
  );
}

export default NavLinks;