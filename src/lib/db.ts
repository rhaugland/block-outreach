import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export function sql(strings: TemplateStringsArray, ...values: any[]) {
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL or POSTGRES_URL environment variable');
  }
  const client = neon(connectionString);
  return client(strings, ...values).then((rows) => ({ rows }));
}
