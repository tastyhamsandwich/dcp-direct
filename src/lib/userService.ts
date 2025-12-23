import { ObjectId } from "mongodb";
import { userDB, type User_DB } from "@lib/database";

const defaultPreferences = {
  pinochle: {
    meldModalClose: "outside",
    recapModalClose: "outside",
    autoReadyEnabled: true,
    handRowLayout: "single",
    handRankOrder: "high-to-low",
    handSuitOrder: "alternating",
  },
} as const;

const mergePreferences = (prefs?: User_DB["preferences"]) => ({
  ...defaultPreferences,
  ...(prefs || {}),
  pinochle: {
    ...defaultPreferences.pinochle,
    ...(prefs?.pinochle || {}),
  },
});

export const getProfileById = async (userId: string): Promise<User_DB | null> => {
  if (!ObjectId.isValid(userId)) return null;
  const users = await userDB();
  const data = await users.findOne({ _id: new ObjectId(userId) });
  if (!data) return null;

  return {
    id: data._id.toString(),
    username: data.username,
    email: data.email,
    preferences: mergePreferences(data.preferences),
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    phone: data.phone || "",
    balance: data.balance || 0,
    avatar: data.avatar || "",
    level: data.level || 1,
    exp: data.exp || 0,
    role: data.role || "USER",
  };
};

export const updateProfileById = async (
  userId: string,
  updates: Partial<User_DB>
): Promise<User_DB | null> => {
  if (!ObjectId.isValid(userId)) return null;
  const users = await userDB();
  await users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        ...updates,
        last_updated: Date.now(),
      },
    }
  );
  return getProfileById(userId);
};
