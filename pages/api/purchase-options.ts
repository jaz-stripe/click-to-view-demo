import { NextApiRequest, NextApiResponse } from 'next';
import { getAvailablePurchaseOptions } from '../../lib/VideoAccess';
import { PurchaseOption } from '../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { videoId, userId } = req.query;

  if (!videoId || !userId) {
    return res.status(400).json({ error: 'Missing videoId or userId' });
  }

  try {
    const options = await getAvailablePurchaseOptions(Number(videoId), Number(userId));
    res.status(200).json({ purchaseOptions: options });
  } catch (error: any) {
    console.error('Error in purchase-options API:', error);
    res.status(500).json({ error: error.message });
  }
}
