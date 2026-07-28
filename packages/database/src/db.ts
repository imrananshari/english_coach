import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';

import * as schema from './schema';

type Database = NeonHttpDatabase<typeof schema>;
let database: Database | undefined;

function createDatabase(): Database {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not configured. Add it to apps/server/.env.local before accessing the database.',
    );
  }
  return drizzle(neon(databaseUrl), { schema });
}

export function getDb(): Database {
  database ??= createDatabase();
  return database;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const value = Reflect.get(getDb(), property);
    return typeof value === 'function' ? value.bind(getDb()) : value;
  },
});
