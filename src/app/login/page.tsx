'use client';

import styles from "./login.module.css";
import { FormMessage, Message } from "@comps/forms/FormMessage";
import { Input } from "@comps/ui/Input";
import { Label } from "@comps/ui/Label";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@lib/zod";
import { useState, useEffect } from "react";
import { useAuth } from "@contexts/authContext";
import { useRouter } from "next/navigation";

const LoginPage = () => {
  const { signIn, error: authError, loading, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const onSubmit = async (data: { email: string; password: string }) => {
    setError(null);
    try {
      await signIn(data.email, data.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="pt-47 flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#111] to-[#222255] text-white">
      <div className="input-container box-border h-128 w-128 p-4 border-4 border-slate-700 content-center">
        <h2 className="banner text-center font-semibold underline-offset-8 font-mono drop-shadow-md text-3xl">
          User Login
        </h2>

        {(error || authError) && (
          <div className="error-message text-red-500 text-center mt-4">
            {error || authError}
          </div>
        )}

        <div id="login" className="flex space-y-4">
          <form className="login" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-item flex flex-row space-x-8 pt-10 justify-between">
              <div className="label-container pl-10">
                <Label htmlFor="email">Email</Label>
              </div>
              <div className={styles.inputcontainer}>
                <Input
                  {...register("email")}
                  className="w-50 text-white bg-slate-800"
                  id="email"
                  type="text"
                  disabled={loading}
                  required
                />
              </div>
              {errors.email?.message && (
                <p className="text-red-500">
                  {errors.email?.message as string}
                </p>
              )}
            </div>
            <div className="form-item flex flex-row space-x-8 ps-5 pt-5 justify-between">
              <div className="label-container pl-10">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className={styles.inputcontainer}>
                <Input
                  {...register("password")}
                  className="w-50 text-white bg-slate-800"
                  id="password"
                  type="password"
                  disabled={loading}
                  required
                />
              </div>
              {errors.password?.message && (
                <p className="text-red-500">
                  {errors.password?.message as string}
                </p>
              )}
            </div>
            <div className="justify-center flex form-submit pt-5">
              <button
                type="submit"
                className="bg-[#4caf50] hover:bg-[#45a049] text-white font-bold py-2 px-4 rounded"
                disabled={loading}
              >
                {loading ? "Logging In..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="text-white pt-10">
        <h3>
          New user?{" "}
          <Link href="/register" className="text-green-300 font-bold text-pretty login-link hover:underline">
            Sign up
          </Link>
          !
        </h3>
        <h3>
          <Link href="/forgot-password" className="text-green-300 font-bold text-pretty login-link hover:underline">
            Forgot Password?
          </Link>
          !
        </h3>
      </div>
    </div>
  );
}

export default LoginPage;