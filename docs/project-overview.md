# Project Overview

## Architecture

DCP Direct is a multiplayer card game built with a modern tech stack:

- **Frontend**: React with Next.js App Router
- **Backend**: Server-side components and WebSockets
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: React Context API
- **Styling**: Tailwind CSS

The application follows a component-based architecture with separation of concerns between UI, game logic, and network code.

## Directory Structure

```
/home/random/Desktop/code/dcp-direct/
├── src/                      # Source code
│   ├── app/                  # Next.js App Router pages
│   │   ├── api/              # API routes
│   │   │   └── socket/       # WebSocket endpoint
│   │   ├── dashboard/        # User dashboard pages
│   │   ├── game/             # Game-related pages
│   │   ├── login/            # Authentication pages
│   │   └── register/         # User registration
│   ├── components/           # Reusable UI components
│   │   ├── auth/             # Auth-related components
│   │   ├── forms/            # Form components
│   │   ├── game/             # Game UI components
│   │   ├── nav/              # Navigation components
│   │   └── ui/               # Generic UI components
│   ├── contexts/             # React Context providers
│   │   ├── authContext.tsx   # Authentication context
│   │   └── gameContext.tsx   # Game state context
│   ├── hooks/                # Custom React hooks
│   │   └── useWebSocket.ts   # WebSocket hook
│   └── lib/                  # Utility functions
│       ├── supabase/         # Supabase client
│       └── utils/            # Helper functions
│           └── gameLogic.ts  # Game mechanics
├── public/                   # Static assets
├── docs/                     # Documentation
└── CLAUDE.md                 # Project guidelines
```

## Key Technologies

- **Next.js 15.2**: React framework with App Router for routing and server components
- **React 19**: UI library for component-based development
- **TypeScript**: For type safety throughout the codebase
- **Tailwind CSS**: Utility-first CSS framework
- **Supabase**: Backend-as-a-service for auth and database
- **WebSockets**: For real-time communication in the game
- **React Context API**: For global state management

## Data Flow

The application follows a clear data flow pattern:

1. **Authentication Flow**:
   - User credentials -> Supabase Auth -> AuthContext -> Protected Routes
   - Profile data stored in Supabase and cached in AuthContext

2. **Game Flow**:
   - User actions -> WebSocket messages -> Server processes action
   - Server updates game state -> Broadcast to all players -> GameContext updates UI

3. **UI Rendering Flow**:
   - Context state changes -> Component re-renders -> UI updates

## Code Structure and Patterns

The codebase follows several consistent patterns:

1. **Feature-based Organization**: Code is organized by feature rather than by type
2. **Component Composition**: UI built from small, reusable components
3. **Context for Global State**: React Context used for application-wide state
4. **Type Safety**: TypeScript interfaces for all data structures
5. **Server/Client Separation**: Clear boundaries between server and client code

## Development Workflow

The development workflow is built around:

1. **TypeScript**: For type checking and code quality
2. **ESLint**: For code linting and best practices
3. **Next.js Development Server**: For hot reloading during development
4. **pnpm**: For package management and scripts