import { successResponse } from '@/lib/responses';

export function GET(): Response {
  return successResponse({ service: 'english-coach-api' });
}
