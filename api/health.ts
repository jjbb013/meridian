export const config = { runtime: 'edge' };

export default async function handler(): Promise<Response> {
  return new Response(
    JSON.stringify({ status: 'ok', service: 'meridian' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
