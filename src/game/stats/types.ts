// A player's aggregate stats across all games played
export interface PlayerStats {
  id: string;
  gamesPlayed: number;
  gamesWon: number;
  totalHandsPlayed: number;
  handsWon: number;
  totalWinnings: number;
  biggestPot: number;
  lastUpdated: string;
  totalBets: number;
}

// The stats and details of a game session as a whole, independent of any one player
export interface GameSessionStats {
  id: string;
  startedAt: string;
  endedAt: string | null;
  gameType: string;
  buyIn: number;
  creator: string;
  players: string[];
  gameId: string;
  gameName: string;
  bestHand: string | null;
  bestHandPlayer: string | null;
  biggestPot: number;
  biggestPotWinner: string | null;
  totalPot: number;
  hardcoreMode: boolean;
  rankedGame: boolean;
  totalHands: number;
}

// A player's stats from a specific game session
export interface PlayerGameStats {
  id: string;
  playerId: string;
  gameId: string;
  buyIn: number;
  cashOut: number;
  handsPlayed: number;
  handsWon: number;
  joinedAt: string;
  leftAt: string;
}

// Stats and details about the poker site as a whole
export interface PokerSiteStats {
  launchedOn: string;
  totalPlayers: number;
  totalGames: number;
  totalHands: number;
  totalPots: number;
  totalWinnings: number;
  totalRake: number;
  mostConcurrentPlayers: number;
  mostConcurrentGames: number;
  totalPayouts: number;
  tournamentsHeld: number;
  lastDowntime: string | null;
  longestDowntime: number | null;
  currentVersion: string;
  lastUpdate: string;
}