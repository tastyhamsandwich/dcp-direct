'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@lib/zod";
import { Input } from "@comps/ui/Input";
import { Label } from "@comps/ui/Label";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@contexts/authContext";
import { useRouter } from "next/navigation";

import "./register.module.css";

const RegisterPage = () => {
  const { signUp, error: authError, loading, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const onSubmit = async (data: { 
    email: string; 
    password: string; 
    username: string;
    dob?: string;
  }) => {
    setError(null);
    try {
      //const dobString = data.dob.toISOString().split('T')[0]; // Convert date to string format
      await signUp(data.email, data.password, data.username, /* REMOVED DOB FOR NOW */);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="pt-47 flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#111] to-[#222255] text-white">
      <div className="input-container box-border h-128 w-128 p-4 border-4 border-slate-700 content-center">
        <h2 className="banner text-center font-semibold underline-offset-8 font-mono drop-shadow-md text-3xl">
          New User Registration
        </h2>
        
        {(error || authError) && (
          <div className="error-message text-red-500 text-center mt-4">
            {error || authError}
          </div>
        )}
        
        <div id="signup" className="flex space-y-4">
          <form className="signup" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-item flex flex-column space-x-8 pt-10 justify-between">
              <div className="label-container pl-10">
                <Label htmlFor="email">Email</Label>
              </div>
              <div className="inputcontainer">
                <Input
                  {...register("email")}
                  className="w-50 text-white bg-slate-800"
                  id="email"
                  type="text"
                  disabled={loading}
                  required
                />
              </div>
              {errors.email?.message && <p className="text-red-500">{errors.email?.message as string}</p>}
            </div>
            <div className="form-item flex flex-column space-x-8 pt-10 justify-between">
              <div className="label-container pl-10">
                <Label htmlFor="username">Username</Label>
              </div>
              <div className="inputcontainer">
                <Input
                  {...register("username")}
                  className="w-50 text-white bg-slate-800"
                  id="username"
                  type="text"
                  disabled={loading}
                  required
                />
              </div>
              {errors.username?.message && <p className="text-red-500">{errors.username?.message as string}</p>}
            </div>
            <div className="form-item flex flex-column space-x-8 pt-10 justify-between">
              <div className="label-container pl-10">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="inputcontainer">
                <Input
                  {...register("password")}
                  className="w-50 text-white bg-slate-800"
                  id="password"
                  type="password"
                  disabled={loading}
                  required
                />
              </div>
              {errors.password?.message && <p className="text-red-500">{errors.password?.message as string}</p>}
            </div>
            <div className="form-item flex flex-column space-x-8 pt-10 justify-between">
              <div className="label-container pl-10">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
              </div>
              <div className="inputcontainer">
                <Input
                  {...register("confirmPassword")}
                  className="w-50 text-white bg-slate-800"
                  id="confirmPassword"
                  type="password"
                  disabled={loading}
                  required
                />
              </div>
              {errors.confirmPassword?.message && (
                <p className="text-red-500">{errors.confirmPassword?.message as string}</p>
              )}
            </div>
            { /*
            <div className="form-item flex flex-column space-x-8 pt-10 justify-between">
              <div className="label-container pl-10">
                <Label htmlFor="dob">Date of Birth</Label>
              </div>
              <div className="inputcontainer">
                <Input
                  {...register("dob")}
                  className="w-50 text-white bg-slate-800"
                  id="dob"
                  type="date"
                  disabled={loading}
                  required
                />
              </div>
              {errors.dob?.message && <p className="text-red-500 font-bold">{errors.dob?.message as string}</p>}
            </div> */ }
            <div className="justify-center flex form-submit pt-5">
              <button
                type="submit"
                className="bg-[#4caf50] hover:bg-[#45a049] text-white font-bold py-2 px-4 rounded"
                disabled={loading}
              >
                {loading ? "Signing up..." : "Sign Up"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="text-white pt-10">
        <h3>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-green-300 font-bold text-pretty login-link hover:underline"
          >
            Log in!
          </Link>
        </h3>
      </div>
    </div>
  );
}

export default RegisterPage;