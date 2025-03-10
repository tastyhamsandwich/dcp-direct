import { connectToDatabase } from '@lib/mongodb';
import { ObjectId } from 'mongodb';

// Save game state to database
export async function saveGameState(gameId: string, gameState) {
  const { db } = await connectToDatabase();
  
  await db.collection('games').updateOne(
    { _id: gameId ? new ObjectId(gameId) : new ObjectId() },
    { $set: { ...gameState, updatedAt: new Date() } },
    { upsert: true }
  );
}

// Load game state from database
export async function loadGameState(gameId: string) {
  const { db } = await connectToDatabase();
  
  const game = await db.collection('games').findOne({
    _id: new ObjectId(gameId)
  });
  
  return game;
}

// Save game history (for statistics)
export async function saveGameHistory(gameData) {
  const { db } = await connectToDatabase();
  
  await db.collection('gameHistory').insertOne({
    ...gameData,
    createdAt: new Date()
  });
}

// Get user statistics
export async function getUserStats(userId) {
  const { db } = await connectToDatabase();
  
  const stats = await db.collection('gameHistory').aggregate([
    { $match: { 'players.id': userId } },
    { $group: {
      _id: userId,
      gamesPlayed: { $sum: 1 },
      gamesWon: { 
        $sum: { 
          $cond: [{ $in: [userId, '$winners'] }, 1, 0] 
        } 
      },
      totalWinnings: { $sum: '$winnings' }
    }}
  ]).toArray();
  
  return stats[0] || { gamesPlayed: 0, gamesWon: 0, totalWinnings: 0 };
}