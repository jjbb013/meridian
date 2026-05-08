import { handleProxy } from '@proxy';

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  return handleProxy(request, process.env.KIMI_API_KEY, '/v1/models');
}
