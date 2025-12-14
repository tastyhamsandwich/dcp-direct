import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername } from '@lib/database';

export async function GET(req: NextRequest) {

  const { username } = await req.json() as { username: string };
  if (!username) {
    return NextResponse.json({
      success: false,
      error: 'Username is required',
    }, { status: 400 });
  }
  try {
    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error(`Error fetching user data: ${error}`);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}