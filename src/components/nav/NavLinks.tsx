import React from 'react'
import Link from 'next/link';


const NavLinks = () => {
  const isLoggedIn = false; // useAuth() for this later
  const links = [
    { path: '/', name: 'Home', protected: false, hideWhenLoggedIn: false },
    { path: '/game', name: 'Play', protected: true, hideWhenLoggedIn: false },
    { path: '/dashboard', name: 'Dashboard', protected: true, hideWhenLoggedIn: false },
    { path: '/help', name: 'Help', protected: false, hideWhenLoggedIn: false },
    { path: '/login', name: 'Login', protected: false, hideWhenLoggedIn: true },
    { path: '/register', name: 'Regiser', protected: false, hideWhenLoggedIn: true },
    { path: '/logout', name: 'Logout', protected: true, hideWhenLoggedIn: false },
  ].map((item) => {
    // Skip items that should be hidden when logged in
    if (item.hideWhenLoggedIn && isLoggedIn) {
        return;
    }

  // Show the item if it's not protected or if the user is logged in and it is protected
  if (!item.protected || (isLoggedIn && item.protected)) {
    return (
      <li className="nav-item" key={item.name}>
        <Link href={item.path} className="rounded-lg px-3 py-2 text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900">{item.name}</Link>
      </li>
    );
  }
  
  return null;
  });   

  return (
    <div className='navlinks-wrapper'>
        <nav className="navlinks">
            <ul>
                {links}
            </ul>
        </nav>
    </div>
  );
}

export default NavLinks;