import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  try {
    const db = await getDb();
    const video = await db.get('SELECT * FROM videos WHERE id = ?', [id]);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    return res.status(200).json({ video });
  } catch (error) {
    console.error('Error fetching video details:', error);
    return res.status(500).json({ error: 'Error fetching video details' });
  }
}
