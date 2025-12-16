import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Dummy balance check for now
  const balance = 0;

  if (balance <= 0) {
    return res.status(400).json({ error: 'Insufficient balance to send campaign.' });
  }

  // Placeholder: put campaign sending logic here
  // For now just return success
  return res.status(200).json({ message: 'Campaign started successfully.' });
}
