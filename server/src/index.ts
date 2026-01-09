import express from 'express';
import cors from 'cors';
import healthRouter, { sendHealthResponse } from './routes/health';
import couponsRouter from './routes/coupons';
import dealsRouter from './routes/deals';
import ingestRouter from './routes/ingest';
import sourcesRouter from './routes/sources';
import storeSuggestionsRouter from './routes/storeSuggestions';
import storesRouter from './routes/stores';
import submissionsRouter from './routes/submissions';
import userCouponsRouter from './routes/userCoupons';
import adminRouter from './routes/admin';
import meRouter from './routes/me';
import { env } from './env';
import { startBackgroundRefresh } from './services/providerManager';
import { seedStores } from './services/storeRepository';
import { syncLegacyStoreMappings } from './services/couponRepository';
import { startFeedWorker } from './feed/worker';

const app = express();

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    time: new Date().toISOString()
  });
});

app.use('/api/health', healthRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/store-suggestions', storeSuggestionsRouter);
app.use('/api/stores', storesRouter);
app.use('/api/user-coupons', userCouponsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/me', meRouter);

app.get('/', (_req, res) => {
  res.json({ ok: true, app: 'Couponify API' });
});

const PORT = Number(process.env.PORT || 4000);

const start = async () => {
  await seedStores();
  await syncLegacyStoreMappings();
  startBackgroundRefresh();
  startFeedWorker();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
