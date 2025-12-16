export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed');
  const from = process.env.TWILIO_FROM || null;
  if (!from) return res.status(404).json({ error: 'No from number configured' });
  return res.status(200).json({ from });
}
