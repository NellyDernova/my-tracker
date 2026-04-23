import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { PORT } from './env.js';
import { userMiddleware, type AppVariables } from './middleware/user.js';
import { projectsRoutes } from './routes/projects.js';
import { tasksRoutes } from './routes/tasks.js';
import { resetRoutes } from './routes/reset.js';

const app = new Hono<{ Variables: AppVariables }>();

app.use('*', logger());
app.use('/api/*', userMiddleware);

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api/projects', projectsRoutes);
app.route('/api/tasks', tasksRoutes);
app.route('/api/reset', resetRoutes);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal', message: err.message }, 500);
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`✓ my-tracker back listening on http://localhost:${info.port}`);
});
