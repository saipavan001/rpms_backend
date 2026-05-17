import Redis from 'ioredis';

let client: Redis | null = null;
let enabled = false;

export const isRedisEnabled = () => enabled;

export const getRedisClient = () => client;

export const connectRedis = async (): Promise<void> => {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    console.log('Redis: disabled (set REDIS_URL to enable caching)');
    return;
  }

  const instance = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    connectTimeout: 5000,
  });

  try {
    await instance.ping();
    client = instance;
    enabled = true;
    console.log('Redis: connected');

    instance.on('error', (err) => {
      console.warn('Redis client error:', err.message);
    });
  } catch (err) {
    console.warn('Redis: connection failed — API will run without cache', err);
    instance.disconnect();
    client = null;
    enabled = false;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (!client) {
    return;
  }
  await client.quit();
  client = null;
  enabled = false;
};
