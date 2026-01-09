import { seedStores } from '../services/storeRepository';

const run = async () => {
  try {
    await seedStores({ force: true });
    console.log('Store catalog seeded');
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : JSON.stringify(error);
    console.error('Failed to seed stores catalog', message);
    process.exit(1);
  }
};

run();
