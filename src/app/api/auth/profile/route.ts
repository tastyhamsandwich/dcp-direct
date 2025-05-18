import { getUserById, type OpResult } from '@db/database';

export async function POST(req: Request, res: Response) {
  try {
    const { userId } = await req.json() as { userId: string };
    
    const result: OpResult = await getUserById(userId);

    if (!result.success) {
      const err = result.error || result.message || "User not found";
      return new Response(JSON.stringify({ err }), { status: 400 });
    }

    return new Response(JSON.stringify(result.user), { status: 200 });
  } catch (error) {
    if (error instanceof Error)
      console.log(`Error fetching profile: ${error.message}`);
    return new Response(JSON.stringify({ error }), { status: 500 });
  }
}