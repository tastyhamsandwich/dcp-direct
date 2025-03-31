# Dealer's Choice Poker

## Overview

DCP is a real-time multiplayer card game application built with Next.js and WebSockets. The application features user authentication, real-time gameplay, and a responsive UI.

Initial documentation has been created over the following subjects:

## Documentation Structure

1. **Project Overview** (`/docs/project-overview.md`)
   - Application architecture and organization
   - Directory structure explanation
   - Key technologies used
   - Data flow patterns

2. **Authentication** (`/docs/authentication.md`)
   - Authentication flow with Supabase
   - User profiles and session management
   - Protected routes implementation
   - WebSocket authentication

3. **Game Logic** (`/docs/game-logic.md`)
   - Core game concepts and data structures
   - Game state management
   - Game initialization and player actions
   - Server-side game management

4. **WebSockets** (`/docs/websockets.md`)
   - Real-time communication implementation
   - Server-side WebSocket handling
   - Client-side connection management
   - Message protocol and types

5. **UI Components** (`/docs/ui-components.md`)
   - Component organization and structure
   - Core UI components examples
   - Game-specific UI components
   - Component design philosophy

6. **API Reference** (`/docs/api-reference.md`)
   - WebSocket API endpoints and message formats
   - REST API endpoints
   - Request and response examples
   - Error handling

## Key Architecture Points

- **Next.js App Router**: Pages and API routes organized in the `/app` directory
- **React Context**: Used for authentication and game state management
- **Supabase**: Handles authentication and user profiles
- **WebSockets**: Real-time communication between clients and server
- **Tailwind CSS**: Utility-first styling approach

## Getting Started

For setup instructions and developer guides, please see the individual documentation files in the `/docs` directory.

## Code Conventions

The project follows these key conventions:

- **TypeScript**: Type safety throughout the codebase
- **Component-Based Architecture**: UI built from reusable components
- **Context API for State**: Global state managed with React Context
- **Feature-Based Organization**: Code organized by feature rather than type

## Future Development

Areas for future development and improvement include:

- Adding more game types beyond the current card game
- Implementing a persistent storage solution for game history
- Enhancing the lobby system with game filtering and searching
- Adding social features like friends lists and private games

## Tasks and Milestones

A checklist for ongoing development:

[X] Basic website scaffolding  
[X] User authentication  
[X] User profile dashboard  
[X] Game lobby access  
[X] Create/join games  
[X] Back-end websocket architecture  
[X] Poker object classes and logic  
[x] Working game sequence  
[ ] AI players  
[ ] Extras  