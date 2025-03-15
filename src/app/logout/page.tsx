'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@contexts/authContext';

export default function LogoutPage() {
  const router = useRouter();
  const { signOut, error: authError, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performSignOut = async () => {
      try {
        await signOut();
        // If we're still here after signOut (which should redirect), redirect manually
        router.push('/');
      } catch (err) {
        console.error('Error during sign out:', err);
        setError(err instanceof Error ? err.message : 'Failed to sign out. Please try again.');
      }
    };

    performSignOut();
  }, [signOut, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#111] to-[#222255] text-white">
      <div className="text-center p-8 bg-slate-800 rounded-lg shadow-lg">
        {(error || authError) ? (
          <>
            <h1 className="text-xl font-semibold text-red-500">
              Sign out failed
            </h1>
            <p className="mt-2 text-gray-300">{error || authError}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Return to Home
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Signing out...</h1>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-[#4caf50] border-t-transparent rounded-full"></div>
            </div>
            <p className="mt-4 text-gray-300">
              Please wait while we sign you out.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
