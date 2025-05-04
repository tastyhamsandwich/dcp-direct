// A player's aggregate stats across all games played
export interface PlayerStats {
  id: string;
  games_played: number;
  games_won: number;
  total_hands_played: number;
  hands_won: number;
  total_winnings: number;
  biggest_pot: number;
  last_updated: string;
}

// The stats and details of a game session as a whole, independent of any one player
export interface GameSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  game_type: string;
  buy_in: number;
  creator: string;
  players: string[];
  game_id: string;
  game_name: string;
  best_hand: string | null;
  best_hand_player: string | null;
  biggest_pot: number;
  biggest_pot_winner: string | null;
  total_pot: number;
  hardcore_mode: boolean;
  ranked_game: boolean;
}

// A player's stats from a specific game session
export interface PlayerGameStats {
  id: string;
  player_id: string;
  game_id: string;
  buy_in: number;
  cash_out: number;
  hands_played: number;
  hands_won: number;
  joined_at: string;
  left_at: string;
}

// Stats and details about the poker site as a whole
export interface PokerSiteStats {
  launched_on: string;
  total_players: number;
  total_games: number;
  total_hands: number;
  total_pots: number;
  total_winnings: number;
  total_rake: number;
  most_concurrent_players: number;
  most_concurrent_games: number;
  total_payouts: number;
  tournaments_held: number;
  last_downtime: string | null;
  longest_downtime: number | null;
  current_version: string;
  last_update: string;
}