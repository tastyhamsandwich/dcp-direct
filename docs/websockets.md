# WebSockets Implementation

DCP Direct uses WebSockets for real-time communication between clients and the server. This allows for immediate game state updates, player actions, and chat messages.

## Overview

The WebSocket implementation consists of:

1. **Server-side WebSocket handler**: API route that manages connections and game state
2. **Client-side WebSocket connections**: Browser WebSocket API with connection management
3. **Message protocol**: JSON-based message format for different types of events

## Server-Side Implementation

The server-side WebSocket is implemented in `/src/app/api/socket/route.ts` as a Next.js API route.

### Connection Management

```typescript
// In-memory state storage
const gameRooms = new Map<string, GameRoom>();
const activeConnections = new Map<string, ExtendedWebSocket>();

// Connection setup
export async function GET(request: Request): Promise<NextResponse> {
  // Extract path and parameters
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Determine if lobby or game connection
  const isLobby = path.includes('/socket/lobby');
  let gameId: string | null = null;
  
  if (!isLobby) {
    gameId = url.pathname.split('/').pop();
    // ...validate gameId
  }
  
  // Authentication
  const { data, error: sessionError } = await supabase.auth.getSession();
  const session = data.session;
  
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  
  // WebSocket upgrade
  const { socket, response } = await upgradePromise;
  
  // Connection tracking
  const connectionId = Math.random().toString(36).substring(2, 15);
  socket.connectionId = connectionId;
  socket.userId = session.user.id;
  socket.username = profile?.username || 'Player';
  socket.isAlive = true;
  
  // Store connection
  activeConnections.set(connectionId, socket);
  
  // Setup ping/pong
  // Handle messages
  // ...
}
```

### Message Handling

```typescript
// Message handling
socket.on('message', async (data: Buffer | string) => {
  try {
    // Parse message
    const message = JSON.parse(dataStr) as WSMessage;
    
    // Handle different message types
    switch (message.type) {
      case 'join_game':
        // ...
      case 'player_action':
        // Process action
        const updatedState = processPlayerAction(
          room.game,
          message.userId,
          message.action.type,
          message.action.data || {}
        );
        // ...
      case 'chat_message':
        // Handle chat
        // ...
    }
  } catch (error) {
    console.error('Error processing WebSocket message:', error);
  }
});
```

### Broadcasting

```typescript
// Helper function to broadcast to all connections in a room
function broadcastToRoom(gameId: string, message: Record<string, any>): void {
  const room = gameRooms.get(gameId);
  if (!room) return;
  
  const data = JSON.stringify(message);
  
  // Send to all connected clients in the room
  [...room.players].forEach(connectionId => {
    const socket = getSocketByConnectionId(connectionId);
    if (socket && socket.readyState === 1) {
      try {
        socket.send(data);
      } catch (error) {
        console.error(`Error sending to socket ${connectionId}:`, error);
      }
    }
  });
}

// Helper function to broadcast game state
function broadcastGameState(gameId: string): void {
  const room = gameRooms.get(gameId);
  if (!room) return;
  
  // Create sanitized state
  const sanitizedGame = {
    ...room.game,
    players: room.game.players.map(player => ({
      id: player.id,
      name: player.name,
      score: player.score,
      hand: player.isActive ? player.hand : [],
      isActive: player.isActive,
      isReady: player.isReady
    }))
  };
  
  broadcastToRoom(gameId, {
    type: 'game_update',
    game: sanitizedGame
  });
}
```

### Connection Health Monitoring

```typescript
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
    socket.terminate();
    clearInterval(pingInterval);
  }
}, PING_INTERVAL);

// Handle connection close
socket.on('close', () => {
  cleanupConnection(connectionId, gameId);
});

// Handle errors
socket.on('error', (error) => {
  console.error(`Socket error for connection ${connectionId}:`, error);
  cleanupConnection(connectionId, gameId);
});
```

## Client-Side Implementation

On the client side, WebSockets are used in the game pages.

### Game Room Connection

```typescript
// From src/app/game/[gameId]/page.tsx
useEffect(() => {
  if (!params.gameId || !user) return;
  
  // Create WebSocket connection
  const ws = new WebSocket(`ws://${window.location.host}/api/socket/${params.gameId}`);
  setSocket(ws);
  
  // Connection opened
  ws.addEventListener('open', () => {
    setIsConnected(true);
    
    // Join the game room
    ws.send(JSON.stringify({
      type: 'join_game',
      gameId: params.gameId,
      userId: user.id,
      username: profile?.username || 'Player'
    }));
  });
  
  // Listen for messages
  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'game_update':
        setGameState(data.game);
        break;
      case 'chat_message':
        setChatMessages(prev => [...prev, data.message]);
        break;
      case 'error':
        alert(data.message);
        router.push('/');
        break;
    }
  });
  
  // Handle errors and cleanup
  // ...
}, [params.gameId, user, profile, router]);
```

### Sending Actions

```typescript
// Handle player actions
const handlePlayerAction = useCallback((actionType: string, amount: number = 0) => {
  if (!socket || !isConnected) return;
  
  socket.send(JSON.stringify({
    type: 'player_action',
    gameId: params.gameId,
    userId: user?.id,
    action: { type: actionType, amount }
  }));
}, [socket, isConnected, params.gameId, user]);

// Handle sending chat messages
const handleSendMessage = useCallback((message: string) => {
  if (!socket || !isConnected || !message.trim()) return;
  
  socket.send(JSON.stringify({
    type: 'chat_message',
    gameId: params.gameId,
    userId: user?.id,
    username: profile?.username || 'Player',
    message: message.trim()
  }));
}, [socket, isConnected, params.gameId, user, profile]);
```

## Message Protocol

### Message Interface

```typescript
// From src/app/api/socket/route.ts
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
```

### Message Types

1. **join_game**: Join a game room
   ```json
   { "type": "join_game", "gameId": "game123", "userId": "user456", "username": "Player1" }
   ```

2. **player_action**: Perform a game action
   ```json
   { 
     "type": "player_action", 
     "gameId": "game123", 
     "userId": "user456", 
     "action": { 
       "type": "playCard", 
       "data": { "cardId": 42 } 
     } 
   }
   ```

3. **game_update**: Server sends updated game state
   ```json
   { 
     "type": "game_update", 
     "game": { /* full game state */ } 
   }
   ```

4. **chat_message**: Send/receive chat message
   ```json
   { 
     "type": "chat_message", 
     "gameId": "game123", 
     "userId": "user456", 
     "username": "Player1", 
     "message": "Hello everyone!" 
   }
   ```

5. **get_games_list**: Request list of available games
   ```json
   { "type": "get_games_list" }
   ```

6. **create_game**: Create a new game room
   ```json
   { 
     "type": "create_game", 
     "userId": "user456", 
     "username": "Player1", 
     "settings": { 
       "name": "My Game", 
       "maxPlayers": 4 
     } 
   }
   ```

## Error Handling

The WebSocket implementation includes robust error handling:

1. **Connection errors**: Handled with error events and reconnection logic
2. **Message parsing errors**: Try/catch around JSON parsing
3. **Action validation**: Server validates all actions before processing
4. **Authentication errors**: WebSocket connections require valid session
5. **Rate limiting**: Large messages are rejected
6. **Input sanitization**: Chat messages are sanitized to prevent XSS

## Security Considerations

Several security measures are implemented:

1. **Authentication**: All connections require valid Supabase session
2. **Authorization**: Actions validated against user ID
3. **Input validation**: All message fields validated before processing
4. **Rate limiting**: Basic protection against message floods
5. **Connection limits**: Maximum connections per game room enforced
6. **Sanitization**: Content sanitized to prevent XSS

## Implementation Files

- **WebSocket Server**: `/src/app/api/socket/route.ts`
- **Game Page Client**: `/src/app/game/[gameId]/page.tsx`
- **Lobby Page Client**: `/src/app/game/page.tsx`
- **WebSocket Hook**: `/src/hooks/useWebSocket.ts`