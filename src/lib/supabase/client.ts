import { createBrowserClient } from "@supabase/ssr";

// Define default cookie options
const DEFAULT_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
};

export const createClient = () => {
  const options = {
    cookieOptions: DEFAULT_COOKIE_OPTIONS
  };

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options
  );
};