import { GameState } from '@game/types';
import { string } from 'zod';

export type { GameList, GameRoom, ExtendedWebSocket, WSMessageType, WSMessage, WSJoinGame, WSPlayerAction, WSStartRound, WSChatMessage, WSGetGamesList, WSGamesList, WSCreateGame };

// WARNING
// WARNING
//! THESE TYPES  ARE  INTENDED  FOR  USE  WITH  A WEBSOCKETS  IMPLEMENTATION
//! CURRENT  SERVER COMMUNICATION USES THE  SOCKET.IO LIBRARY TO  FACILITATE
//! SERVER/CLIENT COMMUNICATION,  AND AS SUCH THESE TYPES SHOULD NOT BE USED
//! THEY ARE RETAINED SOLELY AS A CONTINGENCY AGAINST FUTURE UPDATES/CHANGES
// WARNING
// WARNING

type GameList = GameRoom[];

type GameRoom = {
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

type WSMessageType = 'error' | 'join_game' | 'player_action' | 'start_round' | 'chat_message' | 'get_games_list' | 'create_game' | 'games_list' | 'game_created' | 'game_update' | 'set_round_variant';

type WSMessage = WSError | WSJoinGame | WSPlayerAction | WSStartRound | WSChatMessage | WSGetGamesList | WSGamesList | WSCreateGame | WSGameCreated | WSGameUpdate | WSSetRoundVariant;

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

interface WSSetRoundVariant {
  type: 'set_round_variant';
  userId: string; 
  gameId: string;
  variant: GameVariant;
}
