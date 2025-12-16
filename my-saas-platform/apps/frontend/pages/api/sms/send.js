import querystring from 'querystring';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  const { to, body, from: fromOverride } = req.body || {};
  const account = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const envFrom = process.env.TWILIO_FROM;
  const from = fromOverride || envFrom;

  if (!account || !token || !from) return res.status(500).json({ error: 'Twilio not configured on server' });
  if (!to || !body) return res.status(400).json({ error: 'to and body required' });

  const url = `https://api.twilio.com/2010-04-01/Accounts/${account}/Messages.json`;
  const payload = querystring.stringify({ To: to, From: from, Body: body });

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${account}:${token}`).toString('base64')
      },
      body: payload
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data });
    return res.status(200).json({ sid: data.sid, raw: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
