import { handleHealth } from '@proxy';

export const config = { runtime: 'edge' };

export default async function handler(): Promise<Response> {
  return handleHealth();
}
