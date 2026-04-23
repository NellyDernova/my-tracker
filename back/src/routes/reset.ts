import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { projects, tasks } from '../db/schema.js';
import type { AppVariables } from '../middleware/user.js';

export const resetRoutes = new Hono<{ Variables: AppVariables }>().post('/', (c) => {
  const userId = c.get('userId');
  db.transaction((tx) => {
    tx.delete(tasks).where(eq(tasks.userId, userId)).run();
    tx.delete(projects).where(eq(projects.userId, userId)).run();
  });
  return c.body(null, 204);
});
