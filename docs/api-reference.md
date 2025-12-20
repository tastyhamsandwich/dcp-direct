# API Reference

This document provides a reference for the API endpoints and WebSocket message formats used in DCP Direct.

## WebSocket API

The WebSocket API is the primary method of communication between clients and the server for real-time game interactions.

### Connection Endpoints

- **Game Lobby**: `ws://<host>/api/socket/lobby`
- **Game Room**: `ws://<host>/api/socket/<gameId>`

All WebSocket connections require the user to be authenticated via a valid Supabase session cookie.

### Message Format

All WebSocket messages use JSON format with the following general structure:

```json
{
  "type": "message_type",
  "...additional fields depending on message type..."
}
```

### Client to Server Messages

#### 1. Get Games List

Request the list of available game rooms.

```json
{
  "type": "get_games_list"
}
```

#### 2. Create Game

Create a new game room.

```json
{
  "type": "create_game",
  "userId": "user123",
  "username": "Player1",
  "settings": {
    "name": "My Game Room",
    "maxPlayers": 4
  }
}
```

Required fields:
- `userId`: The authenticated user's ID
- `settings`: Game settings object

#### 3. Join Game

Join an existing game room.

```json
{
  "type": "join_game",
  "gameId": "game123",
  "userId": "user456",
  "username": "Player2"
}
```

Required fields:
- `gameId`: Game room ID
- `userId`: The authenticated user's ID

#### 4. Player Action

Perform a game action.

```json
{
  "type": "player_action",
  "gameId": "game123",
  "userId": "user456",
  "action": {
    "type": "playCard",
    "data": {
      "cardId": 42
    }
  }
}
```

Required fields:
- `gameId`: Game room ID
- `userId`: The authenticated user's ID
- `action.type`: The type of action to perform

Optional fields:
- `action.data`: Additional data for the action

Supported action types:
- `playCard`: Play a card from the player's hand
- `drawCard`: Draw a card from the deck
- `fold`: Fold the current hand
- `check`: Check (in poker)
- `bet`: Place a bet (requires amount in data)
- `call`: Call a bet
- `raise`: Raise a bet (requires amount in data)

#### 5. Start Round

Start a new round in the game.

```json
{
  "type": "start_round",
  "gameId": "game123",
  "userId": "user456"
}
```

Required fields:
- `gameId`: Game room ID
- `userId`: The authenticated user's ID

#### 6. Chat Message

Send a chat message to the game room.

```json
{
  "type": "chat_message",
  "gameId": "game123",
  "userId": "user456",
  "username": "Player2",
  "message": "Hello everyone!"
}
```

Required fields:
- `gameId`: Game room ID
- `userId`: The authenticated user's ID
- `message`: Text content of the message (max 500 chars)

### Server to Client Messages

#### 1. Games List

Response to the get_games_list request.

```json
{
  "type": "games_list",
  "games": [
    {
      "id": "game123",
      "name": "Game Room 1",
      "playerCount": 2,
      "maxPlayers": 4,
      "isStarted": false
    },
    {
      "id": "game456",
      "name": "Game Room 2",
      "playerCount": 3,
      "maxPlayers": 6,
      "isStarted": true
    }
  ]
}
```

#### 2. Game Created

Notification of a new game being created.

```json
{
  "type": "game_created",
  "gameId": "game789"
}
```

#### 3. Game Update

Update to the game state.

```json
{
  "type": "game_update",
  "game": {
    "id": "game123",
    "name": "Game Room 1",
    "players": [
      {
        "id": "user123",
        "name": "Player1",
        "score": 10,
        "hand": [...cards...],
        "isActive": true,
        "isReady": true
      },
      {
        "id": "user456",
        "name": "Player2",
        "score": 5,
        "hand": [...cards...],
        "isActive": true,
        "isReady": true
      }
    ],
    "currentPlayerId": "user123",
    "phase": "playing",
    "roundNumber": 2,
    "message": "Player1's turn",
    "lastUpdate": 1678912345678
  }
}
```

#### 4. Chat Message

Broadcast of a chat message.

```json
{
  "type": "chat_message",
  "message": "Player1: Hello everyone!"
}
```

#### 5. Player Disconnected

Notification when a player disconnects.

```json
{
  "type": "player_disconnected",
  "userId": "user456",
  "username": "Player2"
}
```

#### 6. Error

Error notification.

```json
{
  "type": "error",
  "message": "Unauthorized action"
}
```

## REST API

The REST API is used for authentication and non-real-time operations.

### Authentication Endpoints

Authentication is handled by Supabase Auth, with the following server actions:

#### Login

**Path**: `/api/auth/login`  
**Method**: POST  
**Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "username": "Player1"
  }
}
```

#### Register

**Path**: `/api/auth/register`  
**Method**: POST  
**Body**:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "username": "NewPlayer",
  "dob": "2000-01-01"
}
```
**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user789",
    "email": "newuser@example.com",
    "username": "NewPlayer"
  }
}
```

#### Logout

**Path**: `/api/auth/logout`  
**Method**: POST  
**Response**:
```json
{
  "success": true
}
```

### User Profile Endpoints

#### Get Profile

**Path**: `/api/profile`  
**Method**: GET  
**Response**:
```json
{
  "id": "user123",
  "username": "Player1",
  "balance": 1000,
  "avatar_url": "https://example.com/avatar.jpg",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-02-01T00:00:00Z"
}
```

#### Update Profile

**Path**: `/api/profile`  
**Method**: PATCH  
**Body**:
```json
{
  "username": "NewUsername",
  "avatar_url": "https://example.com/new-avatar.jpg"
}
```
**Response**:
```json
{
  "success": true,
  "profile": {
    "id": "user123",
    "username": "NewUsername",
    "balance": 1000,
    "avatar_url": "https://example.com/new-avatar.jpg",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-03-01T00:00:00Z"
  }
}
```

## Error Handling

All API endpoints return appropriate HTTP status codes:

- **200 OK**: Request succeeded
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Authenticated but not authorized
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side error

WebSocket errors are communicated through error messages with the type "error".