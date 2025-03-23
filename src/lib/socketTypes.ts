import { EarlyGameState, GameState } from '@game/gameLogic';
import { string } from 'zod';

export type { GameList, GameRoom, ExtendedWebSocket, WSMessageType, WSMessage, WSJoinGame, WSPlayerAction, WSStartRound, WSChatMessage, WSGetGamesList, WSGamesList, WSCreateGame };

type GameList = GameRoom[];

type GameRoom = {
  game: EarlyGameState | GameState;
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

type WSMessageType = 'error' | 'join_game' | 'player_action' | 'start_round' | 'chat_message' | 'get_games_list' | 'create_game' | 'games_list' | 'game_created' | 'game_update';

type WSMessage = WSError | WSJoinGame | WSPlayerAction | WSStartRound | WSChatMessage | WSGetGamesList | WSGamesList | WSCreateGame | WSGameCreated | WSGameUpdate;

interface WSError {
  type: 'error';
  message: string;
}

interface WSJoinGame {
  type: 'join_game'
  userId: string;
  username: string;
  gameId: string;
}

interface WSPlayerAction {
  type: 'player_action';
  userId: string;
  action: {
    type: string;
    amount?: number;
  }
}

interface WSStartRound {
  type: 'start_round'
}

interface WSChatMessage {
  type: 'chat_message'
  userId: string;
  username: string;
  gameId: string;
  message: string;
}

interface WSGetGamesList {
  type: 'get_games_list';
  userId: string;
}

interface WSGamesList {
  type: 'games_list';
  games: GameList;
}

interface WSCreateGame {
  type: 'create_game';
  userId: string;
  settings: Record<string, any>;
}

interface WSGameCreated {
  type: 'game_created';
  gameId: string;
}

interface WSGameUpdate {
  type: 'game_update';
  game: GameState;
}