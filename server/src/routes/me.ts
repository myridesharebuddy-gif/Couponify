import { Router } from 'express';
import { z } from 'zod';
import { getPreferencesForDevice, updatePreferencesForDevice } from '../services/preferencesRepository';

const router = Router();

const deviceIdSchema = z.string().nonempty();

const preferenceBodySchema = z.object({
  favoriteStores: z.array(z.string().min(1)).optional(),
  blockedStores: z.array(z.string().min(1)).optional(),
  categories: z.array(z.string().min(1)).optional(),
  watchlist: z.array(z.string().min(1)).optional(),
  notifyOnStoreDrops: z.boolean().optional()
});

const resolveDeviceId = (value?: string | string[]) => {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const sanitizeDeviceIdInput = (input: any) => {
  if (!input) {
    return undefined;
  }
  if (typeof input === 'string' || Array.isArray(input)) {
    return input;
  }
  return undefined;
};

router.get('/preferences', async (req, res) => {
  const deviceIdInput = resolveDeviceId(
    sanitizeDeviceIdInput(req.header('x-device-id') ?? req.query.deviceId)
  );
  const parsed = deviceIdSchema.safeParse(deviceIdInput);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Missing device identifier' });
  }
  const preferences = await getPreferencesForDevice(parsed.data);
  res.json(preferences);
});

router.post('/preferences', async (req, res) => {
  const deviceIdInput = resolveDeviceId(
    sanitizeDeviceIdInput(req.header('x-device-id') ?? req.query.deviceId)
  );
  const deviceIdResult = deviceIdSchema.safeParse(deviceIdInput);
  if (!deviceIdResult.success) {
    return res.status(400).json({ error: 'Missing device identifier' });
  }
  const parsedBody = preferenceBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: parsedBody.error.message });
  }
  const updated = await updatePreferencesForDevice(deviceIdResult.data, parsedBody.data);
  res.json(updated);
});

export default router;
