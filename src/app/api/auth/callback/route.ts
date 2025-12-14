import { NextRequest, NextResponse } from 'next/server';

// Placeholder callback handler now that Supabase is no longer used.
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const redirectTo = requestUrl.searchParams.get('redirect') || '/dashboard';
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
