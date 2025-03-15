# Authentication

The authentication system in DCP Direct uses Supabase for user management and sessions, with React Context for providing auth state throughout the application.

## Authentication Flow

1. **Registration**:
   - User provides email, password, username, and date of birth
   - Account created in Supabase Auth
   - Profile record created in `profiles` table with default balance
   - User redirected to dashboard on success

2. **Login**:
   - User enters email and password
   - Credentials validated with Supabase Auth
   - User profile loaded from database
   - Session stored in browser
   - User redirected to dashboard

3. **Session Management**:
   - Sessions persisted via Supabase
   - Session checked on app load
   - Protected routes redirect to login if no session

4. **Logout**:
   - Session terminated in Supabase
   - Local user state cleared
   - User redirected to home page

## Authentication Context

The `AuthContext` provides authentication state and methods throughout the application:

```tsx
// src/contexts/authContext.tsx
interface AuthContextType {
  user: User | null;              // Supabase user object
  profile: Profile | null;        // User profile data
  session: Session | null;        // Active session
  loading: boolean;               // Loading state
  error: string | null;           // Error messages
  signIn: (email, password) => Promise<void>;
  signUp: (email, password, username, dob) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates) => Promise<void>;
}
```

### Key Methods:

- `signIn`: Authenticates user with email/password
- `signUp`: Creates new user account and profile
- `signOut`: Logs user out and clears session
- `refreshProfile`: Reloads user profile data
- `updateProfile`: Updates user profile information

## User Profile Structure

User profiles are stored in the `profiles` table with the following structure:

```tsx
// src/contexts/authContext.tsx
export interface Profile {
  id: string;          // User ID (matches Supabase Auth ID)
  username: string;    // Display name
  balance: number;     // User's game balance
  avatar_url: string | null; // Profile picture URL
  created_at: string;  // Account creation date
  updated_at: string;  // Last update date
}
```

## Protected Routes

Authentication state is used to protect routes requiring login:

```tsx
// Example from src/app/game/page.tsx
export default function GameLobby() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  // ...rest of component
}
```

## Authentication API

Authentication uses Supabase client APIs:

```tsx
// Sign in example from src/contexts/authContext.tsx
const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    setSession(data.session);
    setUser(data.user);
    
    // Fetch profile data
    if (data.user) {
      const profileData = await fetchProfile(data.user.id);
      if (profileData) {
        setProfile(profileData);
      }
    }
    
    router.push('/dashboard');
  } catch (err) {
    console.error('Error signing in:', err);
    setError('Failed to sign in');
  }
};
```

## Implementation Files

- **Authentication Context**: `src/contexts/authContext.tsx`
- **Login Page**: `src/app/login/page.tsx` and `src/app/login/actions.ts`
- **Registration Page**: `src/app/register/page.tsx` and `src/app/register/actions.ts`
- **Logout Page**: `src/app/logout/page.tsx` and `src/app/logout/actions.ts`
- **Supabase Client**: `src/lib/supabase/client.ts` (browser client)
- **Supabase Server**: `src/lib/supabase/server.ts` (server-side client)

## WebSocket Authentication

WebSocket connections require authentication:

```tsx
// From src/app/api/socket/route.ts
export async function GET(request: Request): Promise<NextResponse> {
  // ...
  try {
    const cookieStore = cookies();
    const supabase = await createClient();
    const { data, error: sessionError } = await supabase.auth.getSession();
    const session = data.session;
    
    if (sessionError) {
      console.error('Authentication error:', sessionError);
      return new NextResponse('Authentication error', { status: 500 });
    }
    
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    // ...WebSocket setup with authenticated user
  } catch (error) {
    // Error handling
  }
}
```