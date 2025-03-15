import { NextResponse } from 'next/server';
import { createClient } from '@supabaseS';
import { cookies } from 'next/headers';
import { GameState, initializeGame, processPlayerAction, checkRoundEnd, startRound } from '@game/gameLogic';

// Define interfaces for type safety
interface GameRoom {
  game: GameState;
  players: Set<string>; // WebSocket connection IDs
}

// For Next.js WebSockets
interface ExtendedWebSocket {
  connectionId: string;
  userId: string;
  username: string;
  isAlive: boolean;
  readyState: number;
  send: (data: string) => void;
  ping: () => void;
  terminate: () => void;
  on: (event: string, handler: (data?: any) => void) => void;
  close: (code?: number, reason?: string) => void;
}

interface WSMessage {
  type: 'join_game' | 'player_action' | 'start_round' | 'chat_message' | 'get_games_list' | 'create_game';
  userId?: string;
  username?: string;
  gameId?: string;
  action?: {
    type: string;
    data?: Record<string, any>;
  };
  message?: string;
  settings?: Record<string, any>;
}

export async function GET(request: Request): Promise<NextResponse> {

    const url = new URL(request.url);
    const gameId = url.pathname.split('/').pop()!;

    const messageType = request.
}