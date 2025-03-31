import { useReducer, useEffect } from 'react';
import { GamePhase, TableSeat, Sidepot, Deck, Card, Action as PlayerAction, Player } from '@src/game/classes';
import { Socket } from 'socket.io-client';

type GameState = {
  id: string;
  name: string;           
  creator: Player;        
  players: Player[];
  status: 'waiting' | 'playing' | 'paused';
  phase: GamePhase;
  maxPlayers: number;
  hasStarted: boolean;
  roundActive: boolean;
  tablePositions: TableSeat[];
  smallBlind: number;
  bigBlind: number;
  dealerIndex: number;
  smallBlindIndex?: number;
  bigBlindIndex?: number;
  dealerId?: string;
  smallBlindId?: string;
  bigBlindId?: string;
  pot: number;
  sidepots?: Sidepot[];
  deck: Deck | null;
  communityCards: Card[];
  burnPile: Card[];
  activePlayerId: string;
  activePlayerIndex: number | null;
  currentBet: number;
}

type GameAction = 
  | { type: 'JOIN_GAME'; payload: Player }
  | { type: 'LEAVE_GAME'; payload: string }
  | { type: 'START_GAME' }
  | { type: 'PLAYER_ACTION'; payload: PlayerAction }
  | { type: 'UPDATE_GAME_STATE'; payload: Partial<GameState> };

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'JOIN_GAME':
      return {
        ...state,
        players: [...state.players, action.payload]
      };
    case 'LEAVE_GAME':
      return {
        ...state,
        players: state.players.filter(p => p.id !== action.payload)
      };
    case 'START_GAME':
      return {
        ...state,
        status: 'playing'
      };
    case 'UPDATE_GAME_STATE':
      return {
        ...state,
        ...action.payload
      };
    default:
      return state;
  }
};

export const useGameState = (socket: Socket | null, initialState: GameState) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    if (!socket) return;

    // Listen for game state updates from server
    socket.on('game_state_update', (newState: Partial<GameState>) => {
      dispatch({ type: 'UPDATE_GAME_STATE', payload: newState });
    });

    socket.on('player_joined', (player: Player) => {
      dispatch({ type: 'JOIN_GAME', payload: player });
    });

    socket.on('player_left', (playerId: string) => {
      dispatch({ type: 'LEAVE_GAME', payload: playerId });
    });

    socket.on('game_started', () => {
      dispatch({ type: 'START_GAME' });
    });

    return () => {
      socket.off('game_state_update');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('game_started');
    };
  }, [socket]);

  return { state, dispatch };
};