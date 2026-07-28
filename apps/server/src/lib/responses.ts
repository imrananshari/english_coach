export function successResponse<T extends Record<string, unknown>>(
  body: T,
  init?: ResponseInit,
): Response {
  return Response.json({ success: true, ...body }, init);
}
