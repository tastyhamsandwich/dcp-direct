"use client";

import { useSearchParams } from "next/navigation";
import { EMAIL_PROVIDERS, type EmailProviderDomains } from '@lib/utils';

export default function ResetLinkSentPage() {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider");

  const getProviderUrl = (domain: string) => {
    return (
      EMAIL_PROVIDERS[domain as EmailProviderDomains] || `https://${domain}`
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-800">
      <div className="w-96 bg-slate-900 p-6 rounded shadow-md text-center">
        <h1 className="text-2xl underline font-bold mb-4">Check Your Email</h1>
        <p className="text-gray-200 mb-2">
          <strong>Success!</strong> <br />A reset link has been sent to your
          email.
        </p>
        <p className="text-gray-400 italic">
          Check your email for further instructions on how to reset your
          password.
        </p>
        {provider && (
          <a
            href={getProviderUrl(provider)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Open {provider} in new tab →
          </a>
        )}
      </div>
    </div>
  );
}
