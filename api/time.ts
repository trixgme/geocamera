import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const now = new Date();
  const tz = (req.query.tz as string) || 'UTC';

  let formatted: string;
  try {
    formatted = now.toLocaleString('ko-KR', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    formatted = now.toISOString().replace('T', ' ').slice(0, 19);
  }

  res.status(200).json({
    iso: now.toISOString(),
    unix: now.getTime(),
    timezone: tz,
    formatted,
  });
}
