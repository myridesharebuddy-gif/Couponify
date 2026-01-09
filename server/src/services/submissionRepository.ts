import crypto from 'crypto';
import { getDb } from '../db';

type SubmissionRow = {
  id: string;
  store: string | null;
  storeId: string | null;
  storeNameSnapshot: string | null;
  storeWebsiteSnapshot: string | null;
  category: string | null;
  description: string | null;
  code: string | null;
  link: string;
  expiresAtISO: string | null;
  postedAtISO: string;
};

export const fetchSubmissions = async (): Promise<SubmissionRow[]> => {
  const db = await getDb();
  const rows = await db.all<SubmissionRow[]>('SELECT * FROM submissions');
  return rows;
};

export const addCommunitySubmission = async (entry: {
  store: string;
  code: string;
  deal: string;
  sourceUrl: string;
}) => {
  const db = await getDb();
  await db.run(
    `
      INSERT INTO submissions (id, store, code, description, link, postedAtISO)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    crypto.randomUUID(),
    entry.store,
    entry.code,
    entry.deal,
    entry.sourceUrl,
    new Date().toISOString()
  );
};
