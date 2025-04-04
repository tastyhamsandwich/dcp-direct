import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Create a response object that we'll modify and return
  let response = NextResponse.next({
    request: request.clone(), // Clone the request to avoid modification issues
  });

  // Create Supabase client with improved cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // First set cookies on the NextResponse object
          cookiesToSet.forEach(({ name, value, options }) => {
            // Apply each cookie with its options
            response.cookies.set({
              name,
              value,
              ...options,
            });
          });
        },
      },
    }
  );

  try {
    // Check auth status
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Handle public routes that don't need auth
    const isPublicRoute = 
      request.nextUrl.pathname === '/' || 
      request.nextUrl.pathname === '/login' || 
      request.nextUrl.pathname === '/register' ||
      request.nextUrl.pathname.startsWith('/auth/');
    
    // Don't redirect auth callback or public pages
    if (request.nextUrl.pathname.startsWith('/auth/callback')) {
      return response;
    }
    
    // Auth redirection logic - protect authenticated routes
    if (!user && !isPublicRoute) {
      const redirectUrl = new URL('/login', request.url);
      // Add a clear indicator for redirection in query params for debugging
      redirectUrl.searchParams.set('redirect_reason', 'no_auth');
      redirectUrl.searchParams.set('from', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users away from login/register
    if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Return the response with properly set cookies
    return response;

  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // On error, still return a valid response to prevent app crash
    // but add debugging info if in development
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('X-Auth-Error', 'Failed to verify authentication');
    }
    
    return response;
  }
}

