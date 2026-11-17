export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
export async function readJson(request: Request, maxChars: number): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('Expected JSON request.');
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxChars) throw new Error('Request is too large.');
  const text = await request.text();
  if (text.length > maxChars) throw new Error('Request is too large.');
  const value = JSON.parse(text) as unknown;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request.');
  return value as Record<string, unknown>;
}
