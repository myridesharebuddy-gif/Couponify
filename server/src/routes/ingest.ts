import { Router } from 'express';
import { runFeedCycle } from '../feed/worker';

const router = Router();

router.post('/run', async (_req, res) => {
  try {
    await runFeedCycle();
    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to run ingestion:', error);
    res.status(500).json({ error: 'Ingestion failed' });
  }
});

export default router;
