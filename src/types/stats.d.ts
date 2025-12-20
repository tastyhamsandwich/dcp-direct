import { Card, Hand } from '@game/classes';

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
  name: string;
  bestHand: Card[] | Hand | null;
  bestHandName?: string;
  bestHandPlayer: string | null;
  biggestPot: number;
  biggestPotWinner: string | null;
  totalPot: number;
  hardcoreMode: boolean;
  rankedGame: boolean;
  totalRounds: number;
  rounds: { [key: number]: RoundStats }
}

export interface RoundStats {
  roundNumber: number;
  variant: string;
  mainPot: number;
  winner: string;
  winningHand: Card[] | Hand | null;
  winningHandName?: string;
  sidePots?: SidepotStats[];
  playerStats: { [key: string]: PlayerRoundStats };
}

export interface SidepotStats {
  amount: number;
  winner: string;
  winningHand: Card[] | Hand | null;
  winningHandName?: string;
}

export interface PlayerRoundStats {
  bets: number;
  calls: number;
  raises: number;
  checks: number;
  folded: boolean;
  winnings: number;
  hand?: Card[] | Hand | null;
  handName?: string;
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