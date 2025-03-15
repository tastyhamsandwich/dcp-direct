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
    data: Record<string, any>;
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

interface WSCreateGame {
  type: 'create_game';
  userId: string;
  gameId: string;
  settings: Record<string, any>;
}


// In-memory game state storage - in production you'd use Redis or similar
const gameRooms = new Map<string, GameRoom>();

// Map to track all active socket connections
const activeConnections = new Map<string, ExtendedWebSocket>();

// Set ping interval to detect stale connections (30 seconds)
const PING_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 35000;

// Handle WebSocket connections
export async function GET(request: Request): Promise<NextResponse> {
  // Extract path and parameters from URL
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Check if this is a lobby connection or a game connection
  const isLobby = path.includes('/socket/lobby');
  let gameId: string | null = null;
  
  if (!isLobby) {
    // Game connection - extract game ID
    gameId = url.pathname.split('/').pop()!;
    
    if (!gameId) {
      return new NextResponse('Game ID is required', { status: 400 });
    }
    
    // Validate game ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) {
      return new NextResponse('Invalid game ID format', { status: 400 });
    }
  }
  
  // Check authentication
  try {
    const cookieStore = cookies();
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
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
    
    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new NextResponse('Failed to fetch user profile', { status: 500 });
    }
    
    // Upgrade to WebSocket
    try {
      // Set a timeout for the upgrade promise
      const upgradePromise = new Promise<{ socket: ExtendedWebSocket | null; response: any }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket upgrade timeout'));
        }, 5000); // 5 second timeout
        
        if (Reflect.has(request, 'socket')) {
          clearTimeout(timeout);
          resolve({ socket: (request as any).socket as ExtendedWebSocket, response: null });
        } else {
          const upgrade = (request as any).upgrade;
          if (upgrade) {
            upgrade(({ socket, response }: { socket: ExtendedWebSocket; response: any }) => {
              clearTimeout(timeout);
              resolve({ socket, response });
            });
          } else {
            clearTimeout(timeout);
            resolve({ socket: null, response: null });
          }
        }
      });
      
      const { socket, response } = await upgradePromise;
      
      if (!socket) {
        return new NextResponse('WebSocket upgrade failed', { status: 500 });
      }
    
    // Set up connection metadata
    const connectionId = Math.random().toString(36).substring(2, 15);
    socket.connectionId = connectionId;
    socket.userId = session.user.id;
    socket.username = profile?.username || 'Player';
    socket.isAlive = true;
    
    if (isLobby) {
      // For lobby connections, no need to check room capacity
      // Just track the connection
      activeConnections.set(connectionId, socket);
    } else if (gameId) {
      // For game connections, check room capacity
      const existingRoom = gameRooms.get(gameId);
      if (existingRoom && existingRoom.players.size >= 100) {
        socket.close(1013, 'Maximum number of players reached');
        return new NextResponse('Maximum number of players reached', { status: 503 });
      }
    }
    
    // Setup ping/pong for connection monitoring
    socket.on('pong', () => {
      socket.isAlive = true;
    });
    
    // Store socket in active connections map
    activeConnections.set(connectionId, socket);
    
    // Handle game room initialization if this is a game connection
    if (gameId && !isLobby) {
      if (!gameRooms.has(gameId)) {
        // Create new game
        const initialPlayers = [{
          id: session.user.id,
          name: profile?.username || 'Player',
          score: 0,
          hand: [],
          isActive: true,
          isReady: true
        }];
        
        const newGame = initializeGame(gameId, initialPlayers);
        
        gameRooms.set(gameId, {
          game: newGame,
          players: new Set([connectionId])
        });
      } else {
        // Join existing game
        const room = gameRooms.get(gameId)!;
        room.players.add(connectionId);
        
        // Add player to game if not already in
        if (!room.game.players.some(p => p.sessionId === session.user.id)) {
          room.game.players.push({
            id: session.user.id,
            name: profile?.username || 'Player',
            score: 0,
            hand: [],
            isActive: true,
            isReady: true
          });
        }
      }
    } else if (isLobby) {
      // Send list of active games to the lobby connection
      const activeGames = Array.from(gameRooms.entries()).map(([id, room]) => {
        return {
          id,
          name: room.game.name || `Game ${id}`,
          playerCount: room.game.players.length,
          maxPlayers: room.game.maxPlayers || 8,
          isStarted: room.game.isStarted || false
        };
      });
      
      socket.send(JSON.stringify({
        type: 'games_list',
        games: activeGames
      }));
    }
    
    // Handle WebSocket events
    socket.on('message', async (data: Buffer | string) => {
      try {
        // Rate limiting - can be improved with a proper rate limiter
        if (typeof data === 'string' && data.length > 10000) {
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Message too large'
          }));
          return;
        }
        
        const dataStr = data.toString();
        let message: WSMessage;
        
        try {
          message = JSON.parse(dataStr) as WSMessage;
        } catch (parseError) {
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Invalid JSON message'
          }));
          return;
        }
        
        // Validate message has required type
        if (!message.type || typeof message.type !== 'string') {
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format: missing type'
          }));
          return;
        }
        
        // Reset isAlive flag on any message activity
        socket.isAlive = true;
        
        // Handle lobby messages
        if (isLobby) {
          switch (message.type) {
            case 'get_games_list':
              // Send list of active games to the lobby connection
              const activeGames = Array.from(gameRooms.entries()).map(([id, room]) => {
                return {
                  id,
                  name: room.game.name || `Game ${id}`,
                  playerCount: room.game.players.length,
                  maxPlayers: room.game.maxPlayers || 8,
                  isStarted: room.game.isStarted || false
                };
              });
              
              socket.send(JSON.stringify({
                type: 'games_list',
                games: activeGames
              }));
              break;
              
            case 'create_game':
              // Create a new game
              if (!message.settings) {
                socket.send(JSON.stringify({
                  type: 'error',
                  message: 'Game settings are required'
                }));
                return;
              }
              
              try {
                // Generate a unique game ID
                const newGameId = `game_${Math.random().toString(36).substring(2, 10)}`;
                
                // Create initial player
                const initialPlayers = [{
                  id: session.user.id,
                  name: profile?.username || 'Player',
                  card: [],
                  active: true,
                  ready: false
                }];
                
                // Initialize the game
                const newGame = initializeGame(newGameId, initialPlayers);
                
                // Apply custom settings if needed
                if (message.settings.name) {
                  newGame.name = message.settings.name;
                }
                if (message.settings.maxPlayers) {
                  newGame.maxPlayers = message.settings.maxPlayers;
                }
                
                // Store the game
                gameRooms.set(newGameId, {
                  game: newGame,
                  players: new Set()
                });
                
                // Notify the client about the created game
                socket.send(JSON.stringify({
                  type: 'game_created',
                  gameId: newGameId
                }));
                
                // Update all lobby clients with the new game list
                registerGameLobby(newGameId, gameSettings, initialPlayers);
              } catch (error) {
                console.error('Error creating game:', error);
                socket.send(JSON.stringify({
                  type: 'error',
                  message: 'Failed to create game'
                }));
              }
              break;
              
            default:
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Unknown lobby message type'
              }));
          }
          return;
        }
        
        // Handle game messages
        if (!gameId) {
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Game ID is required for game operations'
          }));
          return;
        }
        
        const room = gameRooms.get(gameId);
        
        if (!room) {
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Game room not found'
          }));
          return;
        }
        
        switch (message.type) {
          case 'join_game':
            // Player already added when connection established
            broadcastGameState(gameId);
            break;
            
          case 'player_action':
            if (!message.userId || message.userId !== session.user.id) {
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Unauthorized action'
              }));
              return;
            }
            
            if (!message.action || !message.action.type) {
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Invalid action format'
              }));
              return;
            }
            
            try {
              // Process the player action
              const updatedState = processPlayerAction(
                room.game,
                message.userId,
                message.action.type,
                message.action.data || {}
              );
              
              // Check if the round is over
              const finalState = checkRoundEnd(updatedState);
              room.game = finalState;
              
              // Broadcast updated state
              broadcastGameState(gameId);
            } catch (actionError) {
              console.error('Action processing error:', actionError);
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process action'
              }));
            }
            break;
            
          case 'start_round':
            try {
              // Start a new round
              room.game = startRound(room.game);
              broadcastGameState(gameId);
            } catch (roundError) {
              console.error('Start round error:', roundError);
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Failed to start round'
              }));
            }
            break;
            
          case 'chat_message':
            if (!message.message || typeof message.message !== 'string' || message.message.length > 500) {
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Invalid chat message'
              }));
              return;
            }
            
            // Sanitize the message to prevent XSS
            const sanitizedMessage = message.message
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            
            // Broadcast chat message to all players
            broadcastToRoom(gameId, {
              type: 'chat_message',
              message: `${socket.username}: ${sanitizedMessage}`
            });
            break;
            
          default:
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Error processing message'
        }));
      }
    });
    
    // Handle disconnection
    socket.on('close', () => {
      cleanupConnection(connectionId, gameId!);
    });
    
    // Handle socket errors
    socket.on('error', (error) => {
      console.error(`Socket error for connection ${connectionId}:`, error);
      cleanupConnection(connectionId, gameId!);
    });
    
    // Send initial game state
    const currentRoom = gameRooms.get(gameId!);
    socket.send(JSON.stringify({
      type: 'game_update',
      game: currentRoom?.game
    }));
    
    // Set up interval ping for this connection
    const pingInterval = setInterval(() => {
      if (!socket.isAlive) {
        console.log(`Connection ${connectionId} timed out, closing`);
        socket.terminate();
        clearInterval(pingInterval);
        return;
      }
      
      socket.isAlive = false;
      try {
        socket.ping();
      } catch (pingError) {
        console.error(`Error pinging socket ${connectionId}:`, pingError);
        socket.terminate();
        clearInterval(pingInterval);
      }
    }, PING_INTERVAL);
    
    return response || new NextResponse('WebSocket connection established');
    
    } catch (socketError) {
      console.error('WebSocket handling error:', socketError);
      return new NextResponse('WebSocket error', { status: 500 });
    }
  } catch (error) {
    console.error('Authentication or profile error:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}

// Helper function to clean up a connection
function cleanupConnection(connectionId: string, gameId: string): void {
  // Remove from game room
  const room = gameRooms.get(gameId);
  if (room) {
    room.players.delete(connectionId);
    
    // Update game state to mark player as inactive if needed
    const socket = activeConnections.get(connectionId);
    if (socket) {
      const userId = socket.userId;
      const playerIndex = room.game.players.findIndex(p => p.id === userId);
      if (playerIndex !== -1) {
        room.game.players[playerIndex].isActive = false;
      }
      
      // Broadcast player disconnection
      broadcastToRoom(gameId, {
        type: 'player_disconnected',
        userId: userId,
        username: socket.username
      });
      
      // Broadcast updated game state
      broadcastGameState(gameId);
    }
    
    // Remove empty rooms
    if (room.players.size === 0) {
      gameRooms.delete(gameId);
      console.log(`Game room ${gameId} removed as it's now empty`);
    }
  }
  
  // Remove from active connections map
  activeConnections.delete(connectionId);
}

// Helper function to broadcast to all connections in a room
function broadcastToRoom(gameId: string, message: Record<string, any>): void {
  const room = gameRooms.get(gameId);
  if (!room) return;
  
  const data = JSON.stringify(message);
  let sentCount = 0;
  
  // Send to all connected clients in the room
  [...room.players].forEach(connectionId => {
    const socket = getSocketByConnectionId(connectionId);
    if (socket && socket.readyState === 1) { // 1 = OPEN
      try {
        socket.send(data);
        sentCount++;
      } catch (error) {
        console.error(`Error sending to socket ${connectionId}:`, error);
        // Consider cleanup here if send fails
      }
    }
  });
  
  if (sentCount === 0 && room.players.size > 0) {
    console.warn(`Failed to send message to any clients in room ${gameId} despite having ${room.players.size} registered players`);
  }
}

// Helper function to broadcast game state
function broadcastGameState(gameId: string): void {
  const room = gameRooms.get(gameId);
  if (!room) return;
  
  // Create a sanitized version of the game state for broadcasting
  // This prevents sending sensitive data and reduces payload size
  const sanitizedGame = {
    ...room.game,
    players: room.game.players.map(player => ({
      id: player.sessionId,
      name: player.name,
      hand: player.active ? player.cards : [], // Only send hands to active players
      isActive: player.active,
      isReady: player.ready
    }))
  };
  
  broadcastToRoom(gameId, {
    type: 'game_update',
    game: sanitizedGame
  });
}

// Helper to find a socket by connection ID
function getSocketByConnectionId(connectionId: string): ExtendedWebSocket | null {
  return activeConnections.get(connectionId) || null;
}

function registerSocketByConnectionId(connectionId: string): void {

  const socket
}