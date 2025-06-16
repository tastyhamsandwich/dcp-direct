"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@comps/ui/Input";
import { Label } from "@comps/ui/Label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const submitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data: any = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      
      const domain = email.split("@")[1];
      router.push(`/forgot-password/link-sent?provider=${domain}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-800">
      <h1 className="text-2xl font-bold mb-4">Forgot Password</h1>
      <form
        className="w-80 bg-slate-900 p-6 rounded-2xl shadow-md"
        onSubmit={submitHandler}
      >
        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-4">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
            placeholder="Enter your email"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-green-900"
        >
          {isLoading ? "Sending..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
