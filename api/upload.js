export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;

  if (!token || !channel) {
    return res.status(500).json({ error: 'Slack configuration missing' });
  }

  const { image, address, datetime, memo } = req.body || {};

  if (!image) {
    return res.status(400).json({ error: 'Image data required' });
  }

  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const filename = `geocamera_${Date.now()}.jpg`;

  try {
    // Step 1: files.getUploadURLExternal
    const urlRes = await fetch('https://slack.com/api/files.getUploadURLExternal', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        filename,
        length: String(buffer.length),
      }),
    });

    const urlData = await urlRes.json();

    if (!urlData.ok) {
      return res.status(500).json({ error: `Slack URL error: ${urlData.error}` });
    }

    // Step 2: Upload file
    await fetch(urlData.upload_url, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: new Uint8Array(buffer),
    });

    // Step 3: files.completeUploadExternal
    let comment = `📍 ${address || ''}\n🕐 ${datetime || ''}`;
    if (memo) {
      comment += `\n📝 ${memo}`;
    }
    const completeRes = await fetch('https://slack.com/api/files.completeUploadExternal', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [{ id: urlData.file_id, title: filename }],
        channel_id: channel,
        initial_comment: comment,
      }),
    });

    const completeData = await completeRes.json();

    if (!completeData.ok) {
      return res.status(500).json({ error: `Slack upload error: ${completeData.error}` });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({
      error: `Upload failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
