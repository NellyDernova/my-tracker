import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, asc, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tasks } from '../db/schema.js';
import type { AppVariables } from '../middleware/user.js';

const dateTypeEnum = z.enum(['none', 'day', 'week', 'month', 'year', 'life']);
const statusEnum = z.enum(['todo', 'in-progress', 'done']);
const repeatEnum = z.enum([
  'none',
  'daily',
  'weekdays',
  'weekly',
  'custom-weekdays',
  'monthly',
  'yearly',
]);

const createSchema = z.object({
  title: z.string().max(500),
  description: z.string().optional(),
  projectId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  dateType: dateTypeEnum.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: statusEnum.optional(),
  repeat: repeatEnum.optional(),
  repeatDays: z.array(z.number().int().min(0).max(6)).optional(),
  important: z.boolean().optional(),
  position: z.number().int().optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  projectId: z.string().optional(),
  parentId: z.string().optional(),
  date: z.string().optional(),
  status: statusEnum.optional(),
  rootOnly: z.enum(['true', 'false']).optional(),
});

const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const tasksRoutes = new Hono<{ Variables: AppVariables }>()
  .get('/', zValidator('query', listQuerySchema), (c) => {
    const userId = c.get('userId');
    const q = c.req.valid('query');

    const where: SQL[] = [eq(tasks.userId, userId)];
    if (q.projectId) where.push(eq(tasks.projectId, q.projectId));
    if (q.parentId) where.push(eq(tasks.parentId, q.parentId));
    if (q.rootOnly === 'true') where.push(isNull(tasks.parentId));
    if (q.date) where.push(eq(tasks.date, q.date));
    if (q.status) where.push(eq(tasks.status, q.status));

    const rows = db
      .select()
      .from(tasks)
      .where(and(...where))
      .orderBy(desc(tasks.important), asc(tasks.position), asc(tasks.createdAt))
      .all();
    return c.json(rows);
  })
  .get('/:id', (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const row = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .get();
    if (!row) return c.json({ error: 'not_found' }, 404);
    return c.json(row);
  })
  .post('/', zValidator('json', createSchema), (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');
    const [row] = db
      .insert(tasks)
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
      .update(tasks)
      .set(body)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning()
      .all();
    if (!row) return c.json({ error: 'not_found' }, 404);
    return c.json(row);
  })
  .delete('/:id', (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const result = db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .run();
    if (result.changes === 0) return c.json({ error: 'not_found' }, 404);
    return c.body(null, 204);
  })
  .post('/reorder', zValidator('json', reorderSchema), (c) => {
    const userId = c.get('userId');
    const { ids } = c.req.valid('json');
    db.transaction((tx) => {
      ids.forEach((id, idx) => {
        tx.update(tasks)
          .set({ position: idx })
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
          .run();
      });
    });
    const rows = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.id, ids)))
      .orderBy(asc(tasks.position))
      .all();
    return c.json(rows);
  });
