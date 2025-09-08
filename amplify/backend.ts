import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { cacheLayer, addElastiCacheToStack } from './cache/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  cacheLayer,
});

// Add ElastiCache infrastructure to the backend stack
const cacheInfra = addElastiCacheToStack(backend.cacheLayer.resources.lambda.stack);

// Update the cache layer with the actual Redis endpoint
backend.cacheLayer.addEnvironment('CACHE_ENDPOINT', cacheInfra.redisEndpoint);
