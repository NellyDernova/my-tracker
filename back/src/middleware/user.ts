import type { MiddlewareHandler } from 'hono';
import { DEFAULT_USER_ID } from '../env.js';

export type AppVariables = {
  userId: string;
};

export const userMiddleware: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  c.set('userId', DEFAULT_USER_ID);
  await next();
};
