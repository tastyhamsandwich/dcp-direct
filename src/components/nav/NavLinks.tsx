'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@contexts/authContext';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import './navstyles.css';


const NavLinks = () => {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  
  const pathname = usePathname();

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
    
    const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/');

    // Show the item if it's not protected or if the user is logged in and it is protected
    if (!item.protected || (isLoggedIn && item.protected)) {
      return (
        <li className="nav-item" key={item.name}>
          <Link href={item.path} className={clsx("rounded-lg px-4 py-2 duration-300 hover:duration-300 hover:translate-y-2 shadow-2xl hover:rounded-3xl mx-2 hover:border-slate-600 text-slate-700 hover:bg-slate-100 hover:text-slate-900", { "font-bold bg-[#222] s": isActive, "font-medium": !isActive })}>
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