"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@contexts/authContext";
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from "next/link";
import Image from "next/image";
import AvatarUpload from "@comps/tools/AvatarUpload";
import './dashboard.module.css';

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { user, loading } = useAuth();
	const [showUpload, setShowUpload] = useState(false);
	const [imageError, setImageError] = useState(false);
	const [isImageLoading, setIsImageLoading] = useState(true);

  const pathname = usePathname();

  const links = [
    { title: "Overview", path: "/dashboard" },
    { title: "Staistics", path: "/dashboard/stats" },
    { title: "Game History", path: "/dashboard/history" },
    { title: "Settings", path: "/dashboard/settings" },
    { title: "Balance", path: "/dashboard/balance" }
  ].map((link) => {
    
    const isActive = pathname === link.path && link.path !== "/";

    return (
      <li
        key={link.title}
        className={
          isActive
            ? "ml-5 border-l-3 rounded-lg border-blue-600 duration-300 hover:duration-300 hover:translate-x-2"
            : "border-blue-950 hover:ml-5 hover:border-l-3 hover:rounded-lg hover:border-blue-300 duration-300 hover:duration-300 hover:translate-x-2"
        }
      >
        <Link
          href={link.path}
          className={
            isActive
              ? "flex items-center px-4 py-2 bg-[#575757] text-white underline rounded transition-colors duration-200"
              : "flex items-center px-4 py-2 text-gray-300 hover:bg-[#575757] hover:text-white hover:underline rounded transition-colors duration-200"
          }
        >
          {link.title}
        </Link>
      </li>
    );
  })
	// Debug log the avatar URL
	useEffect(() => {
		if (user?.avatar) {
			console.log("Avatar URL:", user.avatar);
			// Reset error state when URL changes
			setImageError(false);
			setIsImageLoading(true);
		}
	}, [user?.avatar]);

	const handleImageLoad = () => {
		console.log("Avatar image loaded successfully");
		setIsImageLoading(false);
		setImageError(false);
	};

	const handleImageError = () => {
		console.error("Failed to load avatar:", user?.avatar);
		setImageError(true);
		setIsImageLoading(false);
	};

	// Debug the current state of avatar display
	useEffect(() => {
		if (user?.avatar) {
			console.log("Avatar display state:", {
				url: `/uploads/avatars/${user.avatar}`,
				isLoading: isImageLoading,
				hasError: imageError,
			});
		}
	}, [user?.avatar, isImageLoading, imageError]);

	return (
    <div className="flex h-screen bg-[#1a1a2e] m-0 p-0">
      {/* Sidebar */}
      <div className="w-64 bg-[#333] text-white shadow-xl relative">
        {/* Profile Section */}
        <div className="p-6 pt-10 border-b border-gray-700">
          <div className="flex flex-col items-center">
            <div
              className="relative w-32 h-32 mb-4 cursor-pointer group"
              onMouseEnter={() => setShowUpload(true)}
              onMouseLeave={() => setShowUpload(false)}
            >
              {user?.avatar && !imageError ? (
                <>
                  <div className="relative w-32 h-32 overflow-hidden rounded-full box-border">
                    {isImageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-600 rounded-full z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#4caf50] border-t-transparent"></div>
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full border-4 border-[#4caf50] z-20 pointer-events-none"></div>
                    <Image
                      src={`/uploads/avatars/${user.avatar}`}
                      alt={user.username || "Profile"}
                      fill
                      sizes="128px"
                      className={`object-cover transition-opacity duration-300 ${
                        isImageLoading ? "opacity-0" : "opacity-100"
                      }`}
                      priority
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                      unoptimized
                    />
                  </div>
                  {/* Hover Overlay */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 transition-opacity duration-200 ${
                      showUpload ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <span className="change-avatar text-white text-sm">
                      Change Avatar
                    </span>
                  </div>
                  {/* Hidden AvatarUpload */}
                  <div
                    className={`absolute inset-0 ${
                      showUpload ? "block" : "hidden"
                    }`}
                  >
                    <AvatarUpload />
                  </div>
                </>
              ) : (
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 rounded-full bg-gray-600 flex items-center justify-center border-4 border-[#4caf50] shadow-lg">
                    <span className="text-4xl">
                      {user?.username?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  {/* Hover Overlay */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 transition-opacity duration-200 ${
                      showUpload ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <span className="text-white text-sm">Add Avatar</span>
                  </div>
                  {/* Hidden AvatarUpload */}
                  <div
                    className={`absolute inset-0 ${
                      showUpload ? "block" : "hidden"
                    }`}
                  >
                    <AvatarUpload />
                  </div>
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold mb-2">
              {user?.username || "Loading..."}
            </h2>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-2">
            {links}
          </ul>
        </nav>

        {/* Balance Display */}
        <div className="absolute bottom-0 left-0 w-full p-6 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Balance</span>
            <span className="text-[#eedd00] font-bold">
              {user?.balance || "0"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#1a1a2e] overflow-y-auto">{children}</div>
    </div>
  );
}
