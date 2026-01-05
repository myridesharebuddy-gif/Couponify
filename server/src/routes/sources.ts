import { Router } from 'express';
import { getFeedStatus } from '../feed/worker';
import { getPublicFeedConfig } from '../feed/config';

const router = Router();

router.get('/', (_req, res) => {
  res.json(getFeedStatus());
});

router.get('/config', (_req, res) => {
  res.json(getPublicFeedConfig());
});

export default router;
