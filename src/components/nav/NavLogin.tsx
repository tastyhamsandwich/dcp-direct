"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
//import { signInAction } from '@/app/actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema } from '@lib/zod';
import { createClient } from '@supabaseC';

const NavLogin = () => {
  const router = useRouter();
  //const { refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('password', data.password);
      
      // Use client-side authentication instead of server action
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      // Navigate to dashboard
      router.push('/dashboard');
            
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'An error occurred during login');
    }
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <div className="error-message text-red-500 text-sm mb-2">
            {error}
          </div>
        )}
        <label htmlFor="email">
          <input 
            className="login-input" 
            type="text" 
            {...register('email')}
            placeholder="Email" 
            aria-describedby="user-email"
            aria-invalid={!!errors.email}
            disabled={isLoading}
            required 
          />
        </label>
        <label htmlFor="password">
          <input
            className="login-input"
            type="password"
            {...register('password')}
            placeholder="Password"
            aria-describedby="user-password"
            aria-invalid={!!errors.password}
            disabled={isLoading}
            required
          />
        </label>
        <div className="button-signup-container">
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
          {isLoading ? 'Logging in...' : 'Login'}
          </button>
          <div className="signup-container">
            <a href="/signup" className="signup-link">New user? Sign up!</a>
          </div>
        </div>
        {errors.email?.message && <p className="text-red-500 text-sm">{errors.email?.message as string}</p>}
        {errors.password?.message && <p className="text-red-500 text-sm">{errors.password?.message as string}</p>}
      </form>
    </div>
  );
}

export default NavLogin;