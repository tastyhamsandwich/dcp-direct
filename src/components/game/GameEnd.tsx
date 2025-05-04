import { useEffect } from "react";
import { useAuth } from "@contexts/authContext";
import { updatePlayerStats, recordGameStats } from "@lib/supabase/stats";
import { createClient } from "@supabaseC";

interface GameEndProps {
	gameId: string;
	gameType: string;
	players: {
		id: string;
		buyIn: number;
		cashOut: number;
		handsPlayed: number;
		handsWon: number;
		position: number;
		joinedAt: string;
		leftAt: string;
	}[];
}

interface PlayerStats {
	id: string;
	games_played: number;
	games_won: number;
	total_hands_played: number;
	hands_won: number;
	total_winnings: number;
	biggest_pot: number;
	last_updated: string;
}

interface GameSession {
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

interface PlayerGameStats {
	id: string;
	player_id: string;
	game_id: string;
	buy_in: number;
	cash_out: number;
	hands_played: number;
	hands_won: number;
	position: number;
	created_at: string;
}

export function GameEnd({ gameId, gameType, players }: GameEndProps) {
	const { user } = useAuth();
	const supabase = createClient();

	useEffect(() => {
		// Record individual player stats
		async function saveGameStats() {
			// Update game session to mark it as ended
			await supabase
				.from("game_sessions")
				.update({ ended_at: new Date().toISOString() })
				.eq("id", gameId);

			// Record stats for each player
			for (const player of players) {
				// Record per-game stats
				await recordGameStats({
					player_id: player.id,
					game_id: gameId,
					buy_in: player.buyIn,
					cash_out: player.cashOut,
					hands_played: player.handsPlayed,
					hands_won: player.handsWon,
					joined_at: player.joinedAt,
					left_at: player.leftAt,
				});

				// Update aggregate stats
				const { data: currentStats } = await supabase
					.from("player_stats")
					.select("*")
					.eq("id", player.id)
					.single();

				const won = player.position === 1;

				await updatePlayerStats({
					id: player.id,
					games_played: (currentStats?.games_played || 0) + 1,
					games_won: (currentStats?.games_won || 0) + (won ? 1 : 0),
					total_hands_played:
						(currentStats?.total_hands_played || 0) + player.handsPlayed,
					hands_won: (currentStats?.hands_won || 0) + player.handsWon,
					total_winnings:
						(currentStats?.total_winnings || 0) +
						(player.cashOut - player.buyIn),
					biggest_pot: Math.max(
						currentStats?.biggest_pot || 0 /* biggest pot from this game */
					),
				});
			}
		}

		saveGameStats();
	}, []);

	// Render game end UI
	// ...
}
