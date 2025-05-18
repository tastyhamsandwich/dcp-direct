import { MongoClient, ServerApiVersion, ObjectId, Long, WithId, Db, BSON } from "mongodb";
import bcrypt from "bcryptjs";

type UserProps = {
  username: string;
  email: string;
  password: string;
  dob?: Date;
};

export type User = {
  id?: string;
  username?: string;
  password?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: number | null;
  balance?: number;
  avatar?: string;
  level?: number;
  exp?: number;
  role?: string;
  created?: Date;
  lastUpdated?: Date;
};

type OpSuccess = {
  success: true;
  message: string;
  user: User;
};

type OpFailure = {
  success: false;
  message: string;
  error: string;
}

export type OpResult = OpSuccess | OpFailure;

const uri = process.env.MONGODB_URI;

const connectDB = async () => {
  const client = new MongoClient(process.env.MONGODB_URI!, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  const database = client.db("dcp");
  return database;
};

const userDB = async () => {
  const users = await connectDB();

  return users.collection("users");
};

export async function validateUser(email: string, password: string): Promise<OpResult> {
  const users = await userDB();

  const data = await users.findOne({ email: email });

  console.log(data);
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
  
  const user: User = {
    id: userId,
    username: data.username,
    email: data.email,
    firstName: data.first_name || "",
    lastName: data.last_name || "",
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

async function checkUserExists(email: string): Promise<boolean> {
  const users = await userDB();

  const data = await users.findOne({ email: email });

  if (data) return true;
  else return false;
}

export const createUser = async (userData: UserProps): Promise<OpResult> => {
  if (await checkUserExists(userData.email)) {
    return { success: false, message: "User already exists", error: "Email already registered" };
  }

  const client = new MongoClient(uri!);
  const database = client.db("dcp");
  const users = database.collection("users");

  try {
    const hashword = await bcrypt.hash(userData.password, 10);
    const created = Long.fromNumber(Date.now());

    const User = {
      _id: new ObjectId(),
      email: userData.email,
      username: userData.username,
      password: hashword,
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
      phone: "",
    };

    const data = await users.insertOne(User);

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

export const updateUser = async (userId: string, userData: User): Promise<OpResult> => {
  const client = new MongoClient(uri!);
  const database = client.db("dcp");
  const users = database.collection("users");

  try {
    const id = new ObjectId(userId);

    const data = await users.findOne({ _id: id });

    if (!data) {
      return { success: false, message: "User not found", error: "User not found" };
    }

    const updatedData = {
      ...data,
      ...userData,
      lastUpdated: Long.fromNumber(Date.now()),
    };

    await users.updateOne({ _id: id }, { $set: updatedData });

    const result: OpSuccess = {
      success: true,
      message: "User updated successfully",
      user: {
        id: userId,
        username: updatedData.username,
        email: updatedData.email,
        firstName: updatedData.firstName || "",
        lastName: updatedData.lastName || "",
        phone: updatedData.phone || null,
        balance: updatedData.balance || 0,
        avatar: updatedData.avatar || "",
        level: updatedData.level || 1,
        exp: updatedData.exp || 0,
        role: updatedData.role || "USER",
      },
    };

    return result;
  } finally {
    await client.close();
  }
}