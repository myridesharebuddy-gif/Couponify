import { Router } from 'express';
import { z } from 'zod';
import { env } from '../env';
import {
  approveStoreSuggestion,
  createStoreSuggestion,
  listStoreSuggestions,
  voteOnStoreSuggestion
} from '../services/storeSuggestionRepository';

const router = Router();

const createSchema = z.object({
  name: z.string().min(2),
  website: z.string(),
  keyword: z.string().max(100).optional(),
  deviceHash: z.string().min(1)
});

const voteSchema = z.object({
  direction: z.enum(['up', 'down']),
  deviceHash: z.string().min(1)
});

router.post('/', async (req, res) => {
  try {
    const payload = createSchema.parse(req.body);
    const result = await createStoreSuggestion(payload);
    if ('exists' in result) {
      return res.status(200).json(result);
    }
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/', async (req, res) => {
  const status = req.query.status === 'approved' ? 'approved' : 'pending';
  const sort = req.query.sort === 'newest' ? 'newest' : 'votes';
  const items = await listStoreSuggestions(status, sort);
  res.json({ items });
});

router.post('/:id/vote', async (req, res) => {
  try {
    const payload = voteSchema.parse(req.body);
    const suggestion = await voteOnStoreSuggestion({
      id: req.params.id,
      direction: payload.direction,
      deviceHash: payload.deviceHash
    });
    res.json({ suggestion });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/:id/approve', async (req, res) => {
  const providedKey = (req.headers['x-admin-key'] as string) || req.query.key;
  if (providedKey !== env.storeSuggestionAdminKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const store = await approveStoreSuggestion(req.params.id);
    res.json({ store });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
