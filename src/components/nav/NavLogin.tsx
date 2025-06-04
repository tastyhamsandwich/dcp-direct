'use client';

import React, { useState } from 'react';
import { Label } from '@comps/ui/Label';
import { Input } from '@comps/ui/Input';
import Link from 'next/link';
import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@lib/zod';
import { useAuth } from '@contexts/authContext';
import './navstyles.css';

const NavLogin = ({ onLoginClicked }) => {
  const { signIn, error: authError, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [visible, setIsVisible] = useState<boolean>(false);
  const [passVisible, setPassVisible] = useState<"password" | "text">("password");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    setError(null);
    try {
      onLoginClicked();
      setPassVisible("password")
      setIsVisible(false);
      await signIn(data.email, data.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleVisClick = () => {
    setIsVisible(!visible);

    if (!visible) 
      setPassVisible("text")
    if (visible)
      setPassVisible("password")
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
        {(error || authError) && (
          <div className="error-message text-red-500 text-sm mb-2">
            {error || authError}
          </div>
        )}
        <div className="mb-2 pr-3 relative -top-1.5">
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            className="login-input"
            type="text"
            {...register("email")}
            placeholder="Email"
            aria-describedby="user-email"
            aria-invalid={!!errors.email}
            disabled={loading}
            required
          />
          {errors.email?.message && (
            <p className="text-red-500 text-xs">
              {errors.email?.message as string}
            </p>
          )}
        </div>

        <div className="mb-2 pr-3 relative top-0.5">
          <Label htmlFor="password" className="sr-only">
            Password
          </Label>
          <Input
            className="login-input w-full text-white bg-slate-800 mb-1"
            type={passVisible}
            {...register("password")}
            placeholder="Password"
            aria-describedby="user-password"
            aria-invalid={!!errors.password}
            disabled={loading}
            required
          />
          {visible ? (
            <EyeOpenIcon
              onClick={handleVisClick}
              className="relative left-41 bottom-7 text-black font-extrabold"
            />
          ) : (
            <EyeClosedIcon
              onClick={handleVisClick}
              className="relative left-41 bottom-7 text-black font-extrabold"
            />
          )}
          {errors.password?.message && (
            <p className="text-red-500 text-xs">
              {errors.password?.message as string}
            </p>
          )}
        </div>

        <div className="button-signup-container flex flex-col items-center relative -top-0.5">
          <button
            type="submit"
            className="login-button bg-[#4caf50] hover:bg-[#45a049] text-white font-bold py-1 px-3 rounded mb-2 w-full"
            disabled={loading}
          >
            {loading ? "Logging In..." : "Log In"}
          </button>
          <div className="signup-container text-sm">
            <Link
              href="/register"
              className="signup-link text-[#8aff8e] hover:underline"
            >
              New user? Sign up!
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

export default NavLogin;