import { createGrammarToken } from '@/lib/ably';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  try {
    return Response.json(await createGrammarToken(session.user.id));
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : 'Grammar realtime is unavailable.' },
      { status: 503 },
    );
  }
}