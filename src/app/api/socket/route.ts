import { NextResponse } from 'next/server';
import { createClient } from '@supabaseS';
import { cookies } from 'next/headers';
import type { GameRoom, ExtendedWebSocket, WSMessageType, WSMessage, WSJoinGame, WSPlayerAction, WSStartRound, WSChatMessage, WSGetGamesList, WSCreateGame } from '@lib/socketTypes';
import { socket } from '../../../../socket';
import Player from '@comps/game/Player';
import { Player as IPlayer, GameState } from '@src/game/classes';


/*
// In-memory game state storage - in production you'd use Redis or similar
const gameRooms = new Map<string, GameRoom>();

// Map to track all active socket connections
const activeConnections = new Map<string, ExtendedWebSocket>();

// Set ping interval to detect stale connections (30 seconds)
const PING_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 35000;

// Handle WebSocket connections
export async function GET(request: Request) {
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
      
      
      if (!socket) {
        return new NextResponse('WebSocket upgrade failed', { status: 500 });
      }
    
    
    
    if (isLobby) {
      // For lobby connections, no need to check room capacity
      // Just track the connection
    
    } else if (gameId) {
      // For game connections, check room capacity
      const existingRoom = gameRooms.get(gameId);
      if (existingRoom && existingRoom.players.size >= 100) {
        socket.close();
        return new NextResponse('Maximum number of players reached', { status: 503 });
      }
    }
    
    // Setup ping/pong for connection monitoring
    socket.on('pong', () => {
      console.log(`Pong!`);
    });
    
    // Store socket in active connections map
    //activeConnections.set(connectionId, socket);
    
    // Handle game room initialization if this is a game connection
    if (gameId && !isLobby) {
      if (!gameRooms.has(gameId)) {
        // Create new game
        const creatorPlayer: IPlayer = {
          id: session.user.id,
          seatNumber: 0,
          username: profile?.username || 'Player',
          avatar: profile?.avatar_url || null,
          chips: profile?.chips || 1000,
          cards: [],
          folded: false,
          active: true,
          ready: false,
          allIn: false,
          currentBet: 0,
          previousAction: 'none',
        }
        
        //const newGame = initializeGame(gameId, creatorPlayer);
        
        /*gameRooms.set(gameId, {
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
            sessionId: session.user.id,
            username: profile?.username || 'Player',
            avatar: profile?.avatar_url || null,
            chips: profile?.chips || 1000,
            cards: [],
            folded: false,
            active: true,
            ready: false,
            allIn: false,
            currentBet: 0,
            previousAction: 'none',
            seatIndex: room.game.players.length // TODO set this to player's seat selection at time of joining
          });
        }
      }
    } else if (isLobby) {*/
    /*  
    const activeGames = Array.from(gameRooms.entries()).map(([id, room]) => {
        return {
          id,
          name: room.game.name || `Game ${id}`,
          playerCount: room.game.players.length,
          maxPlayers: room.game.maxPlayers || 8,
          isStarted: room.game.isStarted || false
        };
      });
      
      socket.send('games_list', {activeGames}
      )
    }
  }
  */
    // Handle WebSocket events
    

                /*
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
                registerGameRoom(newGameId, newGame, creatorPlayer);
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
          socket.emit('error', { message })
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
                room.game as GameState,
                (message as WSPlayerAction).userId,
                (message as WSPlayerAction).action.type,
                (message as WSPlayerAction).action.amount || 0
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
              startRound(room.game as GameState);
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
      const playerIndex = room.game.players.findIndex(p => p.sessionId === userId);
      if (playerIndex !== -1) {
        room.game.players[playerIndex].active = false;
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
*/
// Helper function to broadcast to all connections in a room
