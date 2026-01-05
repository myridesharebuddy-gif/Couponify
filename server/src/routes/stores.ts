import { Router } from 'express';
import { getAllStores } from '../feed/storeRegistry';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    stores: getAllStores().map((store) => ({
      id: store.id,
      name: store.name,
      domains: store.domains,
      aliases: store.aliases,
      country: store.country,
      popularityWeight: store.popularityWeight
    }))
  });
});

export default router;
