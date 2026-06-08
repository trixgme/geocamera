export default function handler(req, res) {
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
  const tz = req.query.tz || 'UTC';

  let formatted;
  let weekday = '';
  try {
    const dtf = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = dtf.formatToParts(now);
    const get = (type) => parts.find((p) => p.type === type)?.value ?? '00';
    weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
    formatted = `${get('year')}-${get('month')}-${get('day')} (${weekday}) ${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pad = (n) => String(n).padStart(2, '0');
    weekday = DAYS[now.getUTCDay()];
    formatted = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} (${weekday}) ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
  }

  return res.status(200).json({
    iso: now.toISOString(),
    unix: now.getTime(),
    timezone: tz,
    formatted,
    weekday,
  });
}
