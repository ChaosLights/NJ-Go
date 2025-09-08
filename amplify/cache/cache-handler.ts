import { Handler } from 'aws-lambda';
import { createClient } from 'redis';

interface CacheRequest {
  action: 'get' | 'set' | 'del' | 'exists' | 'expire';
  key: string;
  value?: string;
  ttl?: number;
}

interface CacheResponse {
  success: boolean;
  data?: any;
  error?: string;
}

let redisClient: any = null;

const getRedisClient = async () => {
  if (!redisClient) {
    const endpoint = process.env.CACHE_ENDPOINT;
    if (!endpoint || endpoint === 'placeholder') {
      throw new Error('Redis endpoint not configured');
    }
    
    redisClient = createClient({
      url: `redis://${endpoint}:6379`,
      socket: {
        connectTimeout: 5000,
        commandTimeout: 5000,
      },
      retry_unfulfilled_commands: true,
      retry_delay: 100,
    });

    redisClient.on('error', (err: Error) => {
      console.error('Redis Client Error:', err);
    });

    await redisClient.connect();
  }
  
  return redisClient;
};

export const handler: Handler<CacheRequest, CacheResponse> = async (event, context) => {
  try {
    const client = await getRedisClient();
    
    switch (event.action) {
      case 'get':
        const value = await client.get(event.key);
        return {
          success: true,
          data: value ? JSON.parse(value) : null,
        };
      
      case 'set':
        if (!event.value) {
          throw new Error('Value is required for set operation');
        }
        
        const serializedValue = JSON.stringify(event.value);
        if (event.ttl) {
          await client.setEx(event.key, event.ttl, serializedValue);
        } else {
          await client.set(event.key, serializedValue);
        }
        
        return { success: true };
      
      case 'del':
        const deleted = await client.del(event.key);
        return {
          success: true,
          data: deleted,
        };
      
      case 'exists':
        const exists = await client.exists(event.key);
        return {
          success: true,
          data: exists === 1,
        };
      
      case 'expire':
        if (!event.ttl) {
          throw new Error('TTL is required for expire operation');
        }
        const expireResult = await client.expire(event.key, event.ttl);
        return {
          success: true,
          data: expireResult === 1,
        };
      
      default:
        throw new Error(`Unsupported action: ${event.action}`);
    }
  } catch (error) {
    console.error('Cache operation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};