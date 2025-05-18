'use client';

import React, { useState } from 'react';
import { useAuth } from '@contexts/authContext';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NavProfile() {
  const { user, signOut } = useAuth();
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-3 p-2 bg-[#444] rounded-lg shadow-md hover:bg-[#555] transition-colors">
      <Link href="/dashboard" className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative w-10 h-10 overflow-hidden rounded-full">
          {user.avatar && !imageError ? (
            <Image
              src={user.avatar}
              alt={user.username || "Profile"}
              fill
              sizes="40px"
              className="object-cover"
              priority
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (                                                                 
            <div className="absolute inset-0 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-white text-lg">
                {user?.username?.charAt(0).toUpperCase() || "?"}
              </span>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="flex flex-col">
          <div className="text-white text-sm font-bold">{user.username}</div>
          <div className="text-gray-400 italic text-sm">
            Chips:{" "}
            <span className="text-[#eedd00] font-bold not-italic text-sm">
              {user.balance}
            </span>
          </div>
        </div>
      </Link>

      {/* Logout button */}
      <button
        onClick={handleSignOut}
        className="ml-2 px-2 py-1 bg-[#550000] hover:bg-[#770000] text-white text-xs rounded transition-colors"
        title="Logout"
      >
        Logout
      </button>
    </div>
  );
}
