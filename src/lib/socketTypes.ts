import { GameState } from '@/types/game';
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

type WSMessageType = 'COM-error' | 'COM-join_game' | 'POK-player_action' | 'start_round' | 'COM-chat_message' | 'COM-get_games_list' | 'COM-create_game' | 'COM-games_list' | 'COM-game_created' | 'POK-game_update' | 'set_round_variant';

type WSMessage = WSError | WSJoinGame | WSPlayerAction | WSStartRound | WSChatMessage | WSGetGamesList | WSGamesList | WSCreateGame | WSGameCreated | WSGameUpdate | WSSetRoundVariant;

interface WSError {
  type: 'COM-error';
  message: string;
}

interface WSJoinGame {
  type: 'COM-join_game'
  userId: string;
  username: string;
  gameId: string;
}

interface WSPlayerAction {
  type: 'POK-player_action';
  gameId: string;
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
  type: 'COM-chat_message'
  userId: string;
  username: string;
  gameId: string;
  message: string;
}

interface WSGetGamesList {
  type: 'COM-get_games_list';
  userId: string;
}

interface WSGamesList {
  type: 'COM-games_list';
  games: GameList;
}

interface WSCreateGame {
  type: 'COM-create_game';
  userId: string;
  settings: Record<string, any>;
}

interface WSGameCreated {
  type: 'COM-game_created';
  gameId: string;
}

interface WSGameUpdate {
  type: 'POK-game_update';
  gameId: string;
  state: GameState;
}

interface WSSetRoundVariant {
  type: 'set_round_variant';
  userId: string; 
  gameId: string;
  variant: GameVariant;
}
