import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useWebSocket } from '@hooks/useWebSocket';

interface IGameContext {
  state: any;
  dispatch: React.Dispatch<any>;
  sendAction: (actionType: any, amount?: number) => void;
  isConnected: boolean;
}

const GameContext = createContext<IGameContext | null>(null);

const initialState = {
  gameId: null,
  players: [],
  communityCards: [],
  deck: [],
  currentTurn: null,
  dealerPosition: 0,
  smallBlind: 5,
  bigBlind: 10,
  pot: 0,
  phase: 'waiting', // waiting, dealing, betting, showdown
  winner: null,
  chat: []
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'JOIN_GAME':
      return {
        ...state,
        gameId: action.payload.gameId,
        players: action.payload.players
      };
    case 'GAME_UPDATE':
      return {
        ...state,
        ...action.payload
      };
    case 'PLAYER_ACTION':
      // Send to server, don't update local state directly
      return state;
    case 'NEW_CHAT_MESSAGE':
      return {
        ...state,
        chat: [...state.chat, action.payload]
      };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { socket, isConnected } = useWebSocket('ws://your-server-url/game');
  
  useEffect(() => {
    if (!socket) return;
    
    // Listen for game updates from the server
    socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'game_update':
          dispatch({ type: 'GAME_UPDATE', payload: data.game });
          break;
        case 'chat_message':
          dispatch({ type: 'NEW_CHAT_MESSAGE', payload: data.message });
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    });
    
    return () => {
      socket.close();
    };
  }, [socket]);
  
  // Function to send player actions to the server
  const sendAction = (actionType, amount = 0) => {
    if (!socket || !isConnected) return;
    
    socket.send(JSON.stringify({
      type: 'player_action',
      action: {
        type: actionType,
        amount: amount,
        gameId: state.gameId,
        playerId: state.currentPlayerId
      }
    }));
  };
  
  return (
    <GameContext.Provider value={{ state, dispatch, sendAction, isConnected }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
