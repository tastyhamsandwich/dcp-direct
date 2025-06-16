'use client';

import styles from "./login.module.css";
import { Input } from "@comps/ui/Input";
import { Label } from "@comps/ui/Label";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@contexts/authContext";
import { EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@lib/zod";
import { useFormStatus } from 'react-dom';
import './login.module.css';

const LoginPage = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const searchParams = useSearchParams();
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
  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      setSuccessMessage(
        "Password has been successfully reset. Please log in with your new password."
      );
    }
  }, [searchParams]);

  return (
    <div className="pt-47 flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#111] to-[#222255] text-white">
      <div className="input-container box-border h-128 w-128 p-4 border-4 border-slate-700 content-center">
        <h2 className="banner text-center font-semibold underline-offset-8 font-mono drop-shadow-md text-3xl">
          User Login
        </h2>

        <div id="login" className="flex space-y-4">
          <form
            className="w-80 relative left-[76px] p-6 rounded items-center justify-center"
            onSubmit={handleSubmit(onSubmit)}
          >
            {successMessage && (
              <div className="flex flex-col relative items-center justify-center mb-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded text-center">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            <div className="form-item flex flex-col space-x-8 p-[10px] justify-around">
              <div className="label-container font-bold mx-1 w-19 mt-2 justify-items-center text-left">
                <Label htmlFor="email" className="font-bold">Login</Label>
              </div>
              <div className={styles.inputcontainer}>
                <Input
                  className="w-65 text-white bg-slate-800"
                  type="text"
                  {...register("email")}
                  placeholder="Email or Username"
                  aria-describedby="user-email"
                  aria-invalid={!!errors.email}
                  disabled={loading}
                  required
                />
              </div>
              {errors.email && (
                <p className="text-red-500">{errors.email?.message}</p>
              )}
            </div>
            <div className="form-item flex flex-col space-x-8 p-[10px] justify-around">
              <div className="label-container text-lg mx-1 w-19 mt-2 align-middle text-left">
                <Label htmlFor="password" className="font-bold">Password</Label>
              </div>
              <div className={styles.inputcontainer}>
                <Input
                  className="w-65 text-white bg-slate-800"
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
                    className="relative left-50 bottom-7 text-white font-extrabold"
                  />
                ) : (
                  <EyeClosedIcon
                    onClick={handleVisClick}
                    className="relative left-50 bottom-7 text-white font-extrabold"
                  />
                )}
              </div>
              {errors.password && (
                <p className="text-red-500">{errors.password?.message}</p>
              )}
            </div>
            <div className="justify-center flex form-submit pt-5">
              <SubmitButton />
            </div>
          </form>
        </div>
      </div>
      <div className="text-white pt-10">
        <h3>
          New user?{" "}
          <Link
            href="/register"
            className="text-green-300 font-bold text-pretty login-link hover:underline"
          >
            Sign up
          </Link>
          !
        </h3>
        <h3>
          <Link
            href="/forgot-password"
            className="text-green-300 font-bold text-pretty login-link hover:underline"
          >
            Forgot Password?
          </Link>
        </h3>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="bg-[#4caf50] hover:bg-[#45a049] text-white font-bold py-2 px-4 rounded"
      disabled={pending} 
    >
      {pending ? "Logging In..." : "Sign in"}
    </button>
  )
}

export default LoginPage;