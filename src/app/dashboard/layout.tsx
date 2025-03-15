"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@contexts/authContext';
import Link from 'next/link';
import Image from 'next/image';
import AvatarUpload from '@comps/AvatarUpload';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { profile, loading } = useAuth();
    const [showUpload, setShowUpload] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(true);

    // Debug log the avatar URL
    useEffect(() => {
        if (profile?.avatar_url) {
            console.log('Avatar URL:', profile.avatar_url);
            // Reset error state when URL changes
            setImageError(false);
            setIsImageLoading(true);
        }
    }, [profile?.avatar_url]);

    const handleImageLoad = () => {
        console.log('Avatar image loaded successfully');
        setIsImageLoading(false);
        setImageError(false);
    };

    const handleImageError = () => {
        console.error('Failed to load avatar:', profile?.avatar_url);
        setImageError(true);
        setIsImageLoading(false);
    };

    // Debug the current state of avatar display
    useEffect(() => {
        if (profile?.avatar_url) {
            console.log('Avatar display state:', {
                url: profile.avatar_url,
                isLoading: isImageLoading,
                hasError: imageError
            });
        }
    }, [profile?.avatar_url, isImageLoading, imageError]);

    return (
        <div className="flex h-screen bg-[#1a1a2e] overflow-hidden m-0 p-0">
            {/* Sidebar */}
            <div className="w-64 bg-[#333] text-white shadow-xl">
                {/* Profile Section */}
                <div className="p-6 pt-10 border-b border-gray-700">
                    <div className="flex flex-col items-center">
                        <div 
                            className="relative w-32 h-32 mb-4 cursor-pointer group"
                            onMouseEnter={() => setShowUpload(true)}
                            onMouseLeave={() => setShowUpload(false)}
                        >
                            {profile?.avatar_url && !imageError ? (
                                <>
                                    <div className="relative w-32 h-32 overflow-hidden rounded-full box-border">
                                        {isImageLoading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-600 rounded-full z-10">
                                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#4caf50] border-t-transparent"></div>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 rounded-full border-4 border-[#4caf50] z-20 pointer-events-none"></div>
                                        <Image
                                            src={`${profile.avatar_url}?t=${Date.now()}`}
                                            alt={profile.username || 'Profile'}
                                            fill
                                            sizes="128px"
                                            className={`object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                                            priority
                                            onLoad={handleImageLoad}
                                            onError={handleImageError}
                                            unoptimized
                                        />
                                    </div>
                                    {/* Hover Overlay */}
                                    <div className={`absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 transition-opacity duration-200 ${showUpload ? 'opacity-100' : 'opacity-0'}`}>
                                        <span className="text-white text-sm">Change Avatar</span>
                                    </div>
                                    {/* Hidden AvatarUpload */}
                                    <div className={`absolute inset-0 ${showUpload ? 'block' : 'hidden'}`}>
                                        <AvatarUpload />
                                    </div>
                                </>
                            ) : (
                                <div className="relative w-full h-full">
                                    <div className="absolute inset-0 rounded-full bg-gray-600 flex items-center justify-center border-4 border-[#4caf50] shadow-lg">
                                        <span className="text-4xl">
                                            {profile?.username?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                    </div>
                                    {/* Hover Overlay */}
                                    <div className={`absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 transition-opacity duration-200 ${showUpload ? 'opacity-100' : 'opacity-0'}`}>
                                        <span className="text-white text-sm">Add Avatar</span>
                                    </div>
                                    {/* Hidden AvatarUpload */}
                                    <div className={`absolute inset-0 ${showUpload ? 'block' : 'hidden'}`}>
                                        <AvatarUpload />
                                    </div>
                                </div>
                            )}
                        </div>
                        <h2 className="text-xl font-bold mb-2">{profile?.username || 'Loading...'}</h2>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="p-4">
                    <ul className="space-y-2">
                        <li>
                            <Link href="/dashboard" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#575757] hover:text-white rounded transition-colors duration-200">
                                Overview
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/stats" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#575757] hover:text-white rounded transition-colors duration-200">
                                Statistics
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/history" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#575757] hover:text-white rounded transition-colors duration-200">
                                Game History
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/settings" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#575757] hover:text-white rounded transition-colors duration-200">
                                Settings
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/balance" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#575757] hover:text-white rounded transition-colors duration-200">
                                Balance
                            </Link>
                        </li>
                    </ul>
                </nav>

                {/* Balance Display */}
                <div className="absolute bottom-0 w-64 p-6 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400">Balance</span>
                        <span className="text-[#eedd00] font-bold">
                            ${profile?.balance || '0'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-[#1a1a2e] overflow-y-auto">
                {children}
            </div>
        </div>
    );
}
