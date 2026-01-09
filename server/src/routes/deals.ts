import { Router } from 'express';
import { z } from 'zod';
import {
  fetchDigestCoupons,
  fetchNormalizedCoupons,
  incrementDealCopy,
  incrementDealSave,
  incrementDealView,
  reportDeal,
  verifyDeal
} from '../services/normalizedCouponRepository';
import { getPreferencesForDevice } from '../services/preferencesRepository';

const router = Router();

const querySchema = z.object({
  sort: z.enum(['hot', 'new', 'expiring', 'verified']).default('hot'),
  storeId: z.string().optional(),
  q: z.string().optional(),
  cursor: z.string().optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional(),
  onlyKnownStores: z.preprocess((value) => {
    if (typeof value === 'string') {
      return value === 'false' ? false : value === 'true' ? true : undefined;
    }
    return value;
  }, z.boolean().optional())
});

const respondWithError = (res: any, error: unknown) => {
  console.error(error);
  res.status(500).json({ error: 'Unable to process request at this time.' });
};

const ensureDeviceId = (req: any): string => {
  const candidate = (req.header('x-device-id') ?? req.query.deviceId) as string | undefined;
  const parsed = z.string().nonempty().safeParse(candidate ?? '');
  if (!parsed.success) {
    throw new Error('Missing device identifier');
  }
  return parsed.data;
};

const recommendedSchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .number()
    .int()
    .min(5)
    .max(100)
    .optional(),
  sort: z.enum(['hot', 'new', 'expiring', 'verified']).optional()
});

const digestSchema = z.object({
  limit: z
    .number()
    .int()
    .min(3)
    .max(30)
    .optional(),
  stores: z.string().optional()
});

router.get('/', async (req, res) => {
  const parsed = querySchema.safeParse({
    sort: req.query.sort,
    storeId: req.query.storeId,
    q: req.query.q,
    cursor: req.query.cursor,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    onlyKnownStores: req.query.onlyKnownStores
  });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  try {
    const result = await fetchNormalizedCoupons({
      sort: parsed.data.sort,
      store: parsed.data.storeId,
      query: parsed.data.q,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
      onlyKnownStores: parsed.data.onlyKnownStores
    });
    res.json(result);
  } catch (error) {
    respondWithError(res, error);
  }
});

const createMetricRoute =
  (handler: (id: string) => Promise<any>) =>
  async (req: any, res: any) => {
    try {
      const result = await handler(req.params.id);
      res.json({ ok: true, deal: result });
    } catch (error) {
      respondWithError(res, error);
    }
  };

router.post('/:id/copy', createMetricRoute((id) => incrementDealCopy(id)));
router.post('/:id/save', createMetricRoute((id) => incrementDealSave(id)));
router.post('/:id/view', createMetricRoute((id) => incrementDealView(id)));
router.post('/:id/report', createMetricRoute((id) => reportDeal(id)));
router.post('/:id/verify', createMetricRoute((id) => verifyDeal(id)));

router.get('/recommended', async (req, res) => {
  let deviceId: string;
  try {
    deviceId = ensureDeviceId(req);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Missing device ID' });
  }
  const parsed = recommendedSchema.safeParse({
    cursor: req.query.cursor,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sort: req.query.sort
  });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  try {
    const preferences = await getPreferencesForDevice(deviceId);
    const result = await fetchNormalizedCoupons({
      sort: parsed.data.sort ?? 'hot',
      limit: parsed.data.limit ?? 20,
      cursor: parsed.data.cursor,
      priorityStoreIds: preferences.favoriteStores,
      excludeStores: preferences.blockedStores,
      onlyKnownStores: true
    });
    res.json(result);
  } catch (error) {
    respondWithError(res, error);
  }
});

router.get('/digest', async (req, res) => {
  const parsed = digestSchema.safeParse({
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    stores: req.query.stores
  });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const stores = parsed.data.stores
    ? parsed.data.stores
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined;
  try {
    const items = await fetchDigestCoupons({ limit: parsed.data.limit ?? 5, stores });
    res.json({ items });
  } catch (error) {
    respondWithError(res, error);
  }
});

export default router;
