import 'mongodb';

import { MongoClient, ServerApiVersion, ObjectId, Long, WithId, Db, BSON } from "mongodb";
import bcrypt from "bcryptjs";
import { Card, Hand } from "@game/classes";
import { PlayerStatsComposite, GameSessionStats, SidepotStats } from '@/types/stats';
import { statsBuffer } from "framer-motion";

type UserProps = {
  username: string;
  email: string;
  password: string;
  dob?: Date;
};

export type User_DB = {
  _id?: ObjectId;
  id?: string;
  username?: string;
  password?: string;
  email?: string;
  preferences?: {
    pinochle?: {
      meldModalClose?: "inside" | "outside" | "anywhere";
      recapModalClose?: "inside" | "outside" | "anywhere";
      autoReadyEnabled?: boolean;
      handRowLayout?: "single" | "split";
      handRankOrder?: "high-to-low" | "low-to-high";
      handSuitOrder?: "alternating" | "black-first" | "red-first";
    };
  };
  first_name?: string | null;
  last_name?: string | null;
  phone?: number | null;
  balance?: number;
  avatar?: string;
  level?: number;
  exp?: number;
  role?: string;
  created_at?: Date | number;
  last_updated?: Date | number;
  active?: boolean;
  reset_password_token?: string | null;
  reset_password_expires?: Date | number | null;
};

export type UserStats_DB = {
  user_id?: ObjectId;
  username?: string;
  games_played?: number;
  games_won?: number;
  total_hands_played?: number;
  hands_won?: number;
  main_pot_winnings?: number;
  side_pot_winnings?: number;
  main_pots_won?: number;
  side_pots_won?: number;
  total_winnings?: number;
  biggest_pot?: number;
  last_updated?: Date | number;
  total_bets?: number;
  times_called?: number,
  times_bet?: number,
  times_raised?: number,
  times_folded?: number,
  times_checked?: number,
  last_played?: Date | number
}

export type GameSessionStats_DB = {
  id: ObjectId;
  started_at?: string;
  ended_at?: string | null;
  game_variants?: { [key: string]: number };
  buy_in?: number | null;
  creator?: string;
  players?: string[];
  game_id?: string;
  game_name?: string;
  best_hand?: Hand | Card[] | null;
  best_hand_player?: string | null;
  biggest_pot?: number;
  biggest_pot_winner?: string | null;
  total_pot?: number;
  hardcore_mode?: boolean;
  ranked_game?: boolean;
  total_hands?: number;
  rounds?: {
    [key: number]: {
      round_number?: number;
      variant?: string;
      total_bets?: number;
      main_pot?: number;
      side_pots?: SidepotStats[];
      playerStats?: { [key: string]: {
        bets?: number;
        calls?: number;
        raises?: number;
        folded?: boolean;
        checks?: number;
        winnings?: number;
        hand?: Card[] | null;
      }}
    }
  }
}

type OpSuccess = {
  success: true;
  message: string;
  user: User_DB;
  data?: {[key: string]: any};
};

type OpFailure = {
  success: false;
  message: string;
  error: string;
}

export type OpResult = OpSuccess | OpFailure;

const uri = process.env.MONGODB_URI;

const emailRegEx = /^([\w-\.]+)@([\w-]+)\.+([\w-]+)/;

const getClient = async () => {
  const client = new MongoClient(process.env.MONGODB_URI!, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  return client;
}

const connectDB = async () => {
  const client = await getClient();
  await client.connect();
  return client.db("dcp");

};

export const userDB = async () => {
  const users = await connectDB();

  return users.collection("users");
};

export async function validateUser(email: string, password: string): Promise<OpResult> {
  const users = await userDB();

  let data;

  if (emailRegEx.test(email))
    data = await users.findOne({ email: email });
  else
    data = await users.findOne({ username: email });
  
  if (!data) {
    console.log(`Username/e-mail could not be located`);
    const result: OpFailure = {
      success: false,
      message: "Login failed",
      error: "Username/e-mail could not be located"
    }
    return result;
  }


  if (!(await bcrypt.compare(password, data.password))) {
    console.log(`Password could not be verified.`);
    const result: OpFailure = {
      success: false,
      message: "Login failed",
      error: "Password could not be verified",
    }
    return result;
  }

  const result: OpSuccess = {
    success: true,
    message: "Login credentials verified",
    user: {
      id: data._id.toString(),
      username: data.username,
      balance: data.balance,
      avatar: data.avatar,
      level: data.level,
      exp: data.exp,
      role: data.role || "USER",
    }
  }
  console.log(`User successfully verified.`);
  return result;

}

export async function getUserById(userId: string): Promise<OpResult> {
  const users = await userDB();
  console.log(`User ID: ${userId}`);

  const bId = new BSON.ObjectId(userId);
  const data = await users.findOne({ _id: bId });

  console.log(data);
  if (!data) { 
    const result: OpFailure = {
      success: false,
      message: "User not found",
      error: "User not found",
    }
    return result;
  }
  if (userId !== data._id.toString()) {
    const result: OpFailure = {
      success: false,
      message: "User ID does not match",
      error: "User ID does not match",
    }
    return result;
  }
  
  const user: User_DB = {
    id: userId,
    username: data.username,
    email: data.email,
    preferences: data.preferences || {},
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    phone: data.phone || "",
    balance: data.balance || 0,
    avatar: data.avatar || "",
    level: data.level || 1,
    exp: data.exp || 0,
    role: data.role || "USER",
  };

  const result: OpSuccess = {
    success: true,
    message: "User found",
    user
  }

  return result;
}

export async function getUserByUsername(username: string): Promise<OpResult> {
  const users = await userDB();

  const data = await users.findOne({ username: username });

  if (!data) {
    const result: OpFailure = {
      success: false,
      message: "User not found",
      error: "User not found",
    };
    return result;
  }

  const user: User_DB = {
    _id: data._id,
    username: data.username,
    email: data.email,
    preferences: data.preferences || {},
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    phone: data.phone || "",
    balance: data.balance || 0,
    avatar: data.avatar || "",
    level: data.level || 1,
    exp: data.exp || 0,
    role: data.role || "USER",
    created_at: data.created_at || Date.now(),
    last_updated: data.last_updated || Date.now(),
  };
  const result: OpSuccess = {
    success: true,
    message: "User found",
    user: data,
  };
  console.log(`User found: ${user.username}`);
  return result;
}

export async function getUserByEmail(email: string): Promise<OpResult> {
  const users = await userDB();

  const data = await users.findOne({ email: email });

  console.log(data);
  if (!data) {
    const result: OpFailure = {
      success: false,
      message: "User not found",
      error: "User not found",
    };
    return result;
  }
  if (email !== data.email) {
    const result: OpFailure = {
      success: false,
      message: "User Email does not match",
      error: "User Email does not match",
    };
    return result;
  }

  const user: User_DB = {
    _id: data._id,
    username: data.username,
    email: data.email,
    preferences: data.preferences || {},
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    phone: data.phone || "",
    balance: data.balance || 0,
    avatar: data.avatar || "",
    level: data.level || 1,
    exp: data.exp || 0,
    role: data.role || "USER",
  };

  const result: OpSuccess = {
    success: true,
    message: "User found",
    user,
  };

  return result;
}

async function checkUserExists(email: string): Promise<boolean> {
  const users = await userDB();

  let data;
  if (emailRegEx.test(email))
    data = await users.findOne({ email: email });
  else
    data = await users.findOne({ username: email });

  if (data) return true;
  else return false;
}

export async function getUserByResetToken(token: string) {
  const client = new MongoClient(uri!);
  const users = (await client).db("dcp").collection("users");

  try {
    const user = await users.findOne({
      reset_password_token: token,
      //reset_password_expires: { $gt: Date.now() },
    });
    return user;
  } catch (error) {
    throw error;
  } finally {
    await client.close();
  }
}

export const createUser = async (userData: UserProps): Promise<OpResult> => {
  if (await checkUserExists(userData.email)) {
    return { success: false, message: "User already exists", error: "Email already registered" };
  }

  const client = new MongoClient(uri!);
  const database = client.db("dcp");
  const users = database.collection("users");
  const statistics = database.collection("statistics");

  try {
    const hashword = await bcrypt.hash(userData.password, 10);
    const created = Date.now();

    const User: User_DB = {
      _id: new ObjectId(),
      email: userData.email,
      username: userData.username,
      password: hashword,
      preferences: {
        pinochle: {
          meldModalClose: "outside",
          recapModalClose: "outside",
          autoReadyEnabled: true,
          handRowLayout: "single",
          handRankOrder: "high-to-low",
          handSuitOrder: "alternating",
        },
      },
      role: "USER",
      level: 1,
      exp: 0,
      avatar: "",
      balance: 500,
      active: true,
      created_at: created,
      last_updated: created,
      first_name: "",
      last_name: "",
      phone: null,
    };

    const data = await users.insertOne(User);

    const newUserStats: UserStats_DB = {
      user_id: data.insertedId,
      username: userData.username,
      games_played: 0,
      games_won: 0,
      total_hands_played: 0,
      hands_won: 0,
      main_pot_winnings: 0,
      side_pot_winnings: 0,
      main_pots_won: 0,
      side_pots_won: 0,
      total_winnings: 0,
      biggest_pot: 0,
      last_updated: Date.now(),
      total_bets: 0,
      times_called: 0,
      times_bet: 0,
      times_raised: 0,
      times_folded: 0,
      times_checked: 0,
    }

    const stats = await statistics.insertOne(newUserStats);

    console.log(`User created with _id: ${data.insertedId}`);

    const id = data.insertedId;
    const result: OpSuccess = {
      success: true,
      message: "User created successfully",
      user: {
        id: id.toString(),
        username: userData.username,
        role: "USER",
        balance: 500,
        avatar: "",
        level: 1,
        exp: 0,
      },
    };

    return result;
  } finally {
    await client.close();
  }
};

/** Updates a user in the database
 * @param userIdentifier - The value to be used against the filter to locate the user
 * @param userData - The object containing the updates to be applied to the user document
 * @param filter - The filter to locate the user document, defaults to '_id' - other options include 'username' or 'email', and others.
 * @param upsert - If true, will insert a new document if no document matches the filter. Defaults to false.
*/
export const updateUser = async (
  userIdentifier: string | ObjectId,
  userData: User_DB,
  filter = `_id`,
  upsert: boolean = false
): Promise<OpResult> => {
  const client = new MongoClient(uri!);
  const database = client.db("dcp");
  const users = database.collection("users");

  try {
    const filterValue =
      filter === "_id" && typeof userIdentifier === "string" && ObjectId.isValid(userIdentifier)
        ? new ObjectId(userIdentifier)
        : userIdentifier;

    const filterObj = { [filter]: filterValue };
    const updatedData = { 
      $set: {
        ...userData,
        last_updated: Long.fromNumber(Date.now()),
      },
    };

    const user = await users.updateOne(filterObj, updatedData, { upsert });

    if (!user.acknowledged || (user.matchedCount === 0 && user.upsertedCount === 0)) {
      const result: OpFailure = {
        success: false,
        message: "User update failed",
        error: "User not found or update not applied"
      };
      return result;
    }

    const updatedId =
      filter === "_id"
        ? (filterValue instanceof ObjectId ? filterValue.toString() : filterValue?.toString())
        : undefined;

    const result: OpSuccess = {
      success: true,
      message: user.upsertedCount > 0 ? "User created successfully" : "User updated successfully",
      user: {
        id: updatedId,
        username: updatedData.$set.username,
        email: updatedData.$set.email,
        preferences: updatedData.$set.preferences || {},
        first_name: updatedData.$set.first_name || "",
        last_name: updatedData.$set.last_name || "",
        phone: updatedData.$set.phone || null,
        balance: updatedData.$set.balance || 0,
        avatar: updatedData.$set.avatar || "",
        level: updatedData.$set.level || 1,
        exp: updatedData.$set.exp || 0,
        role: updatedData.$set.role || "USER",
      },
      data: {
        matchedCount: user.matchedCount,
        modifiedCount: user.modifiedCount
      }
    };

    return result;
  } finally {
    await client.close();
  }
}

/** Function to record new game session statistics for a user.
 * @param gameStatsObject Object which contains the values being recorded.
 * @example
 * gameStatsObject.startedAt: Date
 * gameStatsObject.endedAt: Date
 * gameStatsObject.gameVariants: [key: string]: number
 * gameStatsObject.buyIn: number | null
 * gameStatsObject.creator: string
 * gameStatsObject.players: string[]
 * gameStatsObject.gameId: string
 * gameStatsObject.gameName: string
 * gameStatsObject.bestHand: Hand | Card[] | null
 * gameStatsObject.bestHandPlayer: string | null
 * gameStatsObject.biggestPot: number
 * gameStatsObject.biggestPotWinner: string | null
 * gameStatsObject.totalPot: number
 * gameStatsObject.hardcoreMode: boolean
 * gameStatsObject.rankedGame: boolean
 * gameStatsObject.totalHands: number
 * gameStatsObject.rounds: RoundStats
 */
export const updateGameSessionStats = async (gameStatsObject: GameSessionStats_DB) => {
  const client = new MongoClient(uri!);
  const database = client.db("dcp");
  const gameStats = database.collection("game_stats");

  try {

    const game = await gameStats.insertOne(gameStatsObject);

    if (game.acknowledged) {
      console.log(`Game session stats updated with ID: ${game.insertedId}`);
      return {
        success: true,
        message: "Game session stats updated successfully",
        gameId: game.insertedId.toString(),
      };
    }
  } finally {
    await client.close();
  }
}

export const updatePlayerStats = async (playerStatsObject: PlayerStatsComposite) => {
  const client = new MongoClient(uri!);
  const database = client.db("dcp");
  const users = database.collection("users");
  const statistics = database.collection("statistics");
  const username = playerStatsObject.name;

  try {
    const user = await users.findOne({username});

    if (user) {
      const oldStats = await statistics.findOne({username});

      if (oldStats) {

        let biggestPot: number;

        if (playerStatsObject.personalStats.biggestPot > oldStats.biggest_pot)
          biggestPot = playerStatsObject.personalStats.biggestPot;
        else
          biggestPot = oldStats.biggest_pot;

        const updatedStatsObject = {
          user_id: user._id,
          username: username,
          games_played: playerStatsObject.personalStats.gamesPlayed + oldStats.games_played,
          games_won: playerStatsObject.personalStats.gamesWon + oldStats.games_won,
          total_hands_played: playerStatsObject.personalStats.totalHandsPlayed + oldStats.total_hands_played,
          hands_won: playerStatsObject.personalStats.handsWon + oldStats.hands_won,
          main_pot_winnings: playerStatsObject.personalStats.mainPotWinnings + oldStats.main_pot_winnings,
          side_pot_winnings: playerStatsObject.personalStats.sidePotWinnings + oldStats.side_pot_winnings,
          main_pots_won: playerStatsObject.personalStats.mainPotsWon + oldStats.main_pots_won,
          side_pots_won: playerStatsObject.personalStats.sidePotsWon + oldStats.side_pots_won,
          total_winnings: playerStatsObject.personalStats.totalWinnings + oldStats.total_winnings,
          biggest_pot: biggestPot,
          last_updated: Date.now(),
          total_bets: playerStatsObject.personalStats.totalBets + oldStats.total_bets,
          times_called: playerStatsObject.personalStats.timesCalled + oldStats.times_called,
          times_bet: playerStatsObject.personalStats.timesBet + oldStats.times_bet,
          times_raised: playerStatsObject.personalStats.timesRaised + oldStats.times_raised,
          times_folded: playerStatsObject.personalStats.timesFolded + oldStats.times_folded,
          times_checked: playerStatsObject.personalStats.timesChecked + oldStats.times_checked,
          last_played: Date.now()
        }

        const filter = { username };
        const stats = await statistics.updateOne(filter, updatedStatsObject);

        if (stats.acknowledged) {
          console.log(`Player stats updated for user: ${username}`);
          return {
            success: true,
            message: "Player stats updated successfully",
            playerId: user._id.toString(),
          };
        }
      }
    }
  } finally {
    await client.close();
  }
}
