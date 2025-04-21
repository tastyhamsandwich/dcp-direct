import { createBrowserClient } from "@supabase/ssr";

// In browser environments, we should use the default document.cookie API
// rather than trying to implement our own cookie handling
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: process.env.NEXT_PUBLIC_SUPABASE_DOMAIN,
      }
    }
  );