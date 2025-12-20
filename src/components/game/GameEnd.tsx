/** Client component that notifies the server when a game finishes so it can record stats in MongoDB. */
"use client";

import { useEffect } from "react";
import { useAuth } from "@contexts/authContext";

interface GameEndProps {
	gameId: string;
	gameType: string;
	players: {
		id: string;
		username?: string;
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

	useEffect(() => {
		// Hand off to the server to persist results with the Mongo-backed helpers in /lib/database.ts
		const persistResults = async () => {
			if (!gameId || !players?.length) return;

			try {
				const response = await fetch("/api/game/end", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ gameId, gameType, players }),
				});

				if (!response.ok) {
					console.error("Failed to record game stats", await response.text());
				}
			} catch (err) {
				console.error("Error recording game stats", err);
			}
		};

		persistResults();
	}, [gameId, gameType, players]);

	// Render game end UI
	// ...
}
