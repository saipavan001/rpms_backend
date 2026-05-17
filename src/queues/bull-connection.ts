import type { ConnectionOptions } from 'bullmq';
import { isRedisEnabled } from '../config/redis';

export const getBullConnection = (): ConnectionOptions => {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error('REDIS_URL is required for background export jobs');
  }
  return { url };
};

/** True when Redis connected successfully at startup (not merely when REDIS_URL is set). */
export const isBullMqAvailable = () => isRedisEnabled();
