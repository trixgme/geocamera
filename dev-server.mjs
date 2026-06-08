import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8080;
const PUBLIC_DIR = './public';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  // /api/time 엔드포인트
  if (req.url?.startsWith('/api/time')) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const tz = url.searchParams.get('tz') || 'UTC';
    const now = new Date();

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

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({
      iso: now.toISOString(),
      unix: now.getTime(),
      timezone: tz,
      formatted,
      weekday,
    }));
    return;
  }

  // 정적 파일 서빙
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.setHeader('Content-Type', contentType);
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/time?tz=Asia/Seoul`);
});
