import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '../../apps/server/.env.local' });
config({ path: '../../apps/server/.env' });

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
});
