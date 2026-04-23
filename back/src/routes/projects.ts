import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { projects } from '../db/schema.js';
import type { AppVariables } from '../middleware/user.js';

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  emoji: z.string().max(16).optional(),
  position: z.number().int().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  emoji: z.string().max(16).optional(),
  position: z.number().int().optional(),
});

const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const projectsRoutes = new Hono<{ Variables: AppVariables }>()
  .get('/', (c) => {
    const userId = c.get('userId');
    const rows = db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(asc(projects.position), asc(projects.createdAt))
      .all();
    return c.json(rows);
  })
  .post('/', zValidator('json', createSchema), (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');
    const [row] = db
      .insert(projects)
      .values({ ...body, userId })
      .returning()
      .all();
    return c.json(row, 201);
  })
  .patch('/:id', zValidator('json', updateSchema), (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const [row] = db
      .update(projects)
      .set(body)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning()
      .all();
    if (!row) return c.json({ error: 'not_found' }, 404);
    return c.json(row);
  })
  .delete('/:id', (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const result = db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .run();
    if (result.changes === 0) return c.json({ error: 'not_found' }, 404);
    return c.body(null, 204);
  })
  .post('/reorder', zValidator('json', reorderSchema), (c) => {
    const userId = c.get('userId');
    const { ids } = c.req.valid('json');
    db.transaction((tx) => {
      ids.forEach((id, idx) => {
        tx.update(projects)
          .set({ position: idx })
          .where(and(eq(projects.id, id), eq(projects.userId, userId)))
          .run();
      });
    });
    const rows = db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), inArray(projects.id, ids)))
      .orderBy(asc(projects.position))
      .all();
    return c.json(rows);
  });
