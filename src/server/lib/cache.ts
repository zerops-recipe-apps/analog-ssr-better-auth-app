import Redis from 'ioredis';

/**
 * Valkey is wire-compatible with Redis, so the well-established `ioredis`
 * client works against it unchanged — connecting via the full
 * `${cache_connectionString}` (aliased to `CACHE_URL`) carries the
 * mandatory auth automatically. Valkey on Zerops REQUIRES auth; connecting
 * without a password throws `NOAUTH Authentication required.` on the first
 * command.
 */
export const cache = new Redis(process.env['CACHE_URL'] as string, {
  // Fail fast on the status-check path rather than ioredis's default of
  // queuing commands indefinitely while it retries in the background.
  maxRetriesPerRequest: 3,
});

cache.on('error', (err) => {
  // ioredis emits 'error' on every reconnect attempt while the connection
  // is down; log without crashing the process (an unhandled 'error' event
  // on an EventEmitter is fatal in Node otherwise).
  console.error('cache: connection error', err.message);
});

const SESSION_CACHE_PREFIX = 'session-user:';
const SESSION_CACHE_TTL_SECONDS = 20;
const CACHE_HITS_KEY = 'cache:hits';
const CACHE_MISSES_KEY = 'cache:misses';

export async function getCachedProfile(cacheKey: string): Promise<string | null> {
  return cache.get(SESSION_CACHE_PREFIX + cacheKey);
}

export async function setCachedProfile(cacheKey: string, value: string): Promise<void> {
  await cache.set(SESSION_CACHE_PREFIX + cacheKey, value, 'EX', SESSION_CACHE_TTL_SECONDS);
}

export async function invalidateCachedProfile(cacheKey: string): Promise<void> {
  await cache.del(SESSION_CACHE_PREFIX + cacheKey);
}

export async function recordCacheHit(): Promise<void> {
  await cache.incr(CACHE_HITS_KEY);
}

export async function recordCacheMiss(): Promise<void> {
  await cache.incr(CACHE_MISSES_KEY);
}

export async function getCacheCounters(): Promise<{ hits: number; misses: number }> {
  const [hits, misses] = await cache.mget(CACHE_HITS_KEY, CACHE_MISSES_KEY);
  return { hits: Number(hits ?? 0), misses: Number(misses ?? 0) };
}

/**
 * Status-strip liveness check — a real PING round-trip, not just "the
 * client object exists".
 */
export async function isCacheHealthy(): Promise<boolean> {
  try {
    const pong = await cache.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
