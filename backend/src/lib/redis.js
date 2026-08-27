import { createClient } from 'redis';
import { ENV } from './env.js';

const redisUrl = ENV.REDIS_URL || 'redis://localhost:6379';

// Main client for presence tracking and key-value storage
export const redisClient = createClient({ url: redisUrl });

// Pub/Sub clients dedicated to the Socket.io adapter
export const pubClient = createClient({ url: redisUrl });
export const subClient = pubClient.duplicate();

redisClient.on('error', (err) => console.error('[redis] Main Client Error:', err));
pubClient.on('error', (err) => console.error('[redis] Pub Client Error:', err));
subClient.on('error', (err) => console.error('[redis] Sub Client Error:', err));

export const connectRedis = async () => {
  try {
    console.log('[redis] Connecting to Redis...');
    await Promise.all([
      redisClient.connect(),
      pubClient.connect(),
      subClient.connect()
    ]);
    console.log('[redis] Connected to Redis successfully.');
  } catch (error) {
    console.error('[redis] Failed to connect to Redis:', error);
    throw error;
  }
};
