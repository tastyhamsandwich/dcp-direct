'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const NavBar = dynamic(() => import('./NavBar'), { ssr: false });

const NavBarClient: React.FC = () => <NavBar />;

export default NavBarClient;
