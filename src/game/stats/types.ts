// A player's aggregate stats across all games played

export interface CompositeStatsObject {
  game: GameSessionStats;
  players: {[key: string]: PlayerStatsComposite};
}

export interface PlayerStatsComposite {
  id: string;
  name: string;
  personalStats: PlayerStats;
  gameStats: PlayerGameStats;
}

// General stats for a given player
export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalHandsPlayed: number;
  handsWon: number;
  mainPotWinnings: number;
  sidePotWinnings: number;
  mainPotsWon: number;
  sidePotsWon: number;
  totalWinnings: number;
  biggestPot: number;
  lastUpdated: string;
  totalBets: number;
  timesCalled: number,
  timesBet: number,
  timesRaised: number,
  timesFolded: number,
  timesChecked: number,
}

// A player's stats from a specific game session
export interface PlayerGameStats {
  gameId: string;
  gameName: string;
  buyIn: number | null;
  cashOut: number | null;
  handsPlayed: number;
  handsWon: number;
  totalBets: number;
  biggestPot: number;
  joinedAt: string;
  leftAt: string;
  timesCalled: number;
  timesBet: number;
  timesRaised: number;
  timesFolded: number;
  timesChecked: number;
}

// The stats and details of a game session as a whole, independent of any one player
export interface GameSessionStats {
  id: string;
  startedAt: string;
  endedAt: string | null;
  gameVariants: { [key: string]: number };
  buyIn: number | null;
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