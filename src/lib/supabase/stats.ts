import { createClient } from "./server";
import { PlayerStats, GameSession, PlayerGameStats } from "@game/stats/types";

// Get player's overall stats
export async function getPlayerStats(
	playerId: string
): Promise<PlayerStats | null> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("player_stats")
		.select("*")
		.eq("id", playerId)
		.single();

	if (error) {
		console.error("Error fetching player stats:", error);
		return null;
	}

	return data as PlayerStats;
}

// Create or update player's overall stats
export async function updatePlayerStats(
	stats: Partial<PlayerStats> & { id: string }
): Promise<PlayerStats | null> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("player_stats")
		.upsert(
			{
				...stats,
				last_updated: new Date().toISOString(),
			},
			{ onConflict: "id" }
		)
		.select()
		.single();

	if (error) {
		console.error("Error updating player stats:", error);
		return null;
	}

	return data as PlayerStats;
}

// Record a player's performance and stats in a game session
export async function recordGameStats(
	gameStats: Omit<PlayerGameStats, "id" | "created_at">
): Promise<PlayerGameStats | null> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("player_game_stats")
		.insert(gameStats)
		.select()
		.single();

	if (error) {
		console.error("Error recording game stats:", error);
		return null;
	}

	return data as PlayerGameStats;
}
