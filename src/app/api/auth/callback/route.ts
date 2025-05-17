import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Define default cookie options to ensure consistency
const DEFAULT_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 7, // 1 week
  path: "/",
  sameSite: "lax" as const,
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // Create a response where we will set cookies
  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  
  if (code) {
    // Create supabase client on the request using consistent approach with getAll/setAll
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Apply consistent cookie options
              response.cookies.set({
                name,
                value,
                ...DEFAULT_COOKIE_OPTIONS,
                ...options,
              });
            });
          },
        },
      }
    );
    
    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}