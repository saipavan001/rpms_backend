import { getRedisClient, isRedisEnabled } from '../config/redis';

export const cached = async <T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> => {
  if (!isRedisEnabled()) {
    return fetcher();
  }

  const redis = getRedisClient();
  if (!redis) {
    return fetcher();
  }

  try {
    const raw = await redis.get(key);
    if (raw !== null) {
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.warn(`Cache read failed for ${key}:`, err);
  }

  const value = await fetcher();

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.warn(`Cache write failed for ${key}:`, err);
  }

  return value;
};

export const cacheDel = async (key: string): Promise<void> => {
  if (!isRedisEnabled()) {
    return;
  }
  const redis = getRedisClient();
  if (!redis) {
    return;
  }
  try {
    await redis.del(key);
  } catch (err) {
    console.warn(`Cache delete failed for ${key}:`, err);
  }
};

export const cacheDelByPrefix = async (prefix: string): Promise<void> => {
  if (!isRedisEnabled()) {
    return;
  }
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.warn(`Cache prefix delete failed for ${prefix}:`, err);
  }
};

export const cacheDelMany = async (keys: string[]): Promise<void> => {
  if (!keys.length || !isRedisEnabled()) {
    return;
  }
  const redis = getRedisClient();
  if (!redis) {
    return;
  }
  try {
    await redis.del(...keys);
  } catch (err) {
    console.warn('Cache bulk delete failed:', err);
  }
};
