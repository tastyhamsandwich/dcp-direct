import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { updateGameSessionStats, updatePlayerStats } from "@lib/database";
import type { PlayerStats, PlayerGameStats } from "@/types/stats";

type PlayerPayload = {
  id: string;
  username?: string;
  buyIn: number;
  cashOut: number;
  handsPlayed: number;
  handsWon: number;
  position: number;
  joinedAt: string;
  leftAt: string;
};

export async function POST(req: NextRequest) {
  try {
    const { gameId, gameType, players } = (await req.json()) as {
      gameId: string;
      gameType: string;
      players: PlayerPayload[];
    };

    if (!gameId || !Array.isArray(players)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Record the overall game session
    await updateGameSessionStats({
      id: new ObjectId(),
      game_id: gameId,
      game_name: gameType,
      players: players.map((p) => p.id),
      ended_at: new Date().toISOString(),
      total_hands: players.reduce((sum, p) => sum + (p.handsPlayed || 0), 0),
      total_pot: players.reduce(
        (sum, p) => sum + Math.max((p.cashOut || 0) - (p.buyIn || 0), 0),
        0
      ),
    });

    // Update per-player aggregates
    for (const player of players) {
      const won = player.position === 1;

      const personalStats: PlayerStats = {
        gamesPlayed: 1,
        gamesWon: won ? 1 : 0,
        totalHandsPlayed: player.handsPlayed || 0,
        handsWon: player.handsWon || 0,
        mainPotWinnings: 0,
        sidePotWinnings: 0,
        mainPotsWon: won ? 1 : 0,
        sidePotsWon: 0,
        totalWinnings: (player.cashOut || 0) - (player.buyIn || 0),
        biggestPot: Math.max((player.cashOut || 0) - (player.buyIn || 0), 0),
        lastUpdated: new Date().toISOString(),
        totalBets: 0,
        timesCalled: 0,
        timesBet: 0,
        timesRaised: 0,
        timesFolded: 0,
        timesChecked: 0,
      };

      const gameStats: PlayerGameStats = {
        gameId,
        gameName: gameType,
        buyIn: player.buyIn ?? null,
        cashOut: player.cashOut ?? null,
        handsPlayed: player.handsPlayed ?? 0,
        handsWon: player.handsWon ?? 0,
        totalBets: 0,
        biggestPot: Math.max((player.cashOut || 0) - (player.buyIn || 0), 0),
        joinedAt: player.joinedAt,
        leftAt: player.leftAt,
        timesCalled: 0,
        timesBet: 0,
        timesRaised: 0,
        timesFolded: 0,
        timesChecked: 0,
      };

      await updatePlayerStats({
        id: player.id,
        name: player.username || player.id,
        personalStats,
        gameStats,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording game end stats", error);
    return NextResponse.json(
      { error: "Failed to record game stats" },
      { status: 500 }
    );
  }
}
