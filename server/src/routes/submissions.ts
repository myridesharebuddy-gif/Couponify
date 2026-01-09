import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { getDb } from '../db';
import { resolveStoreFromDomain } from '../feed/storeRegistry';
import { canonicalizeUrl, extractDomain } from '../feed/utils';

const router = Router();

const submissionSchema = z.object({
  website: z.string().url(),
  code: z.string().optional(),
  notes: z.string().optional()
});

router.post('/', async (req, res) => {
  const parsed = submissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const db = await getDb();
  const canonical = canonicalizeUrl(parsed.data.website);
  const domain = extractDomain(canonical);
  const store = resolveStoreFromDomain(domain);
  const now = new Date().toISOString();
  await db.run(
    `
      INSERT INTO submissions (
        id, store, storeId, storeNameSnapshot, storeWebsiteSnapshot,
        description, code, link, expiresAtISO, postedAtISO, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    crypto.randomUUID(),
    store?.name ?? 'Unknown store',
    store?.id ?? 'unknown',
    store?.name ?? 'Unknown store',
    store?.domains[0] ?? canonical,
    parsed.data.notes ?? '',
    parsed.data.code ?? '',
    canonical,
    null,
    now,
    'community'
  );
  res.json({ ok: true });
});

export default router;
