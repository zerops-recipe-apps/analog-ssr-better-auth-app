import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

/**
 * Better Auth server instance, mounted onto Analog's Nitro server via the
 * catch-all route at `src/server/routes/api/auth/[...all].ts`.
 *
 * Database: raw `pg.Pool` — Better Auth's built-in Kysely adapter accepts a
 * node-postgres Pool directly and introspects the dialect from it.
 */
export const auth = betterAuth({
  database: new Pool({
    host: process.env['DB_HOST'],
    port: Number(process.env['DB_PORT'] ?? 5432),
    user: process.env['DB_USER'],
    password: process.env['DB_PASSWORD'],
    database: process.env['DB_NAME'],
  }),
  secret: process.env['BETTER_AUTH_SECRET'],
  baseURL: process.env['APP_URL'],
  trustedOrigins: [process.env['APP_URL']].filter(
    (value): value is string => Boolean(value),
  ),
  emailAndPassword: {
    enabled: true,
  },
});
