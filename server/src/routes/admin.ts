import { Router } from 'express';
import { z } from 'zod';
import { env } from '../env';
import { runFeedCycle } from '../feed/worker';
import { getAdminStats } from '../services/adminStats';

const router = Router();

const tokenSchema = z
  .string()
  .nonempty()
  .transform((value) => value.trim())
  .optional();

const authorizeAdmin = (req: any, res: any) => {
  const provided = tokenSchema.safeParse(req.header('x-admin-token') ?? undefined);
  if (!provided.success || provided.data !== env.storeSuggestionAdminKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
};

router.post('/refresh', async (req, res) => {
  if (!authorizeAdmin(req, res)) {
    return;
  }
  await runFeedCycle();
  res.json({ ok: true });
});

router.post('/ingest', async (req, res) => {
  if (!authorizeAdmin(req, res)) {
    return;
  }
  await runFeedCycle();
  res.json({ ok: true });
});

router.get('/stats', async (req, res) => {
  if (!authorizeAdmin(req, res)) {
    return;
  }
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (error) {
    console.error('Failed to build admin stats', error);
    res.status(500).json({ error: 'Unable to fetch stats' });
  }
});

export default router;
