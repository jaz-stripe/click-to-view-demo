import { NextApiRequest, NextApiResponse } from 'next';
import { checkUserAccess } from '../../lib/VideoAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { videoId, userId } = req.query;

  if (!videoId || !userId) {
    return res.status(400).json({ error: 'Missing videoId or userId' });
  }

  try {
    const hasAccess = await checkUserAccess(Number(videoId), Number(userId));
    res.status(200).json({ hasAccess });
  } catch (error: any) {
    console.error('Error in check-access API:', error);
    res.status(500).json({ error: error.message });
  }
}
