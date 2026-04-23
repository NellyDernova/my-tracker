import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { newId } from '../lib/id.js';

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    userId: text('user_id').notNull().default('me'),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    emoji: text('emoji').notNull().default('📁'),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  },
  (t) => [index('idx_projects_user').on(t.userId)],
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    userId: text('user_id').notNull().default('me'),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    parentId: text('parent_id').references((): AnySQLiteColumn => tasks.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    dateType: text('date_type').notNull().default('none'),
    date: text('date'),
    status: text('status').notNull().default('todo'),
    repeat: text('repeat').notNull().default('none'),
    repeatDays: text('repeat_days', { mode: 'json' }).$type<number[]>().notNull().default(sql`'[]'`),
    important: integer('important', { mode: 'boolean' }).notNull().default(false),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  },
  (t) => [
    index('idx_tasks_user').on(t.userId),
    index('idx_tasks_project').on(t.projectId),
    index('idx_tasks_parent').on(t.parentId),
    index('idx_tasks_date').on(t.date),
    index('idx_tasks_group').on(t.userId, t.projectId, t.parentId),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
