'use client';

import React, { useState } from 'react';
import { useAuth } from '@contexts/authContext';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NavProfile() {
  const { profile, signOut } = useAuth();
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  const handleImageError = () => {
    setIsImageLoading(false);
    setImageError(true);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Guard clause if profile isn't loaded yet
  if (!profile) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-2 bg-[#444] rounded-lg shadow-md hover:bg-[#555] transition-colors">
      <Link href="/dashboard" className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative w-10 h-10 overflow-hidden rounded-full">
          {profile.avatar_url && !imageError ? (
            <>
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-600 rounded-full z-10">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#4caf50] border-t-transparent"></div>
                </div>
              )}
              <Image
                src={`${profile.avatar_url}?t=${Date.now()}`}
                alt={profile.username || "Profile"}
                fill
                sizes="40px"
                className={`object-cover transition-opacity duration-300 ${
                  isImageLoading ? "opacity-0" : "opacity-100"
                }`}
                priority
                onLoad={handleImageLoad}
                onError={handleImageError}
                unoptimized
              />
            </>
          ) : (
            <div className="absolute inset-0 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-white text-lg">
                {profile?.username?.charAt(0).toUpperCase() || "?"}
              </span>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="flex flex-col">
          <div className="text-white text-sm font-bold">{profile.username}</div>
          <div className="text-gray-400 italic text-sm">
            Chips:{" "}
            <span className="text-[#eedd00] font-bold not-italic text-sm">
              {profile.balance}
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
