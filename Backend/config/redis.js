const Redis = require("ioredis");

/**
 * Hybrid Redis Client with Automatic In-Memory TTL Cache Fallback.
 * Ensures Task 2 (Search Caching) and Task 6 (Recommendation Caching)
 * operate at sub-millisecond speeds whether a local Redis daemon is running or not.
 */
class CacheManager {
    constructor() {
        this.memoryStore = new Map();
        this.redisClient = null;
        this.isRedisConnected = false;
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            provider: "in-memory-fallback",
        };

        this.initRedis();
    }

    initRedis() {
        if (process.env.REDIS_ENABLED !== "true") {
            return;
        }

        try {
            this.redisClient = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
                maxRetriesPerRequest: 1,
                retryStrategy: (times) => {
                    if (times > 2) {
                        return null; // Stop retrying and use in-memory store seamlessly
                    }
                    return Math.min(times * 200, 1000);
                },
                lazyConnect: true,
            });

            this.redisClient.on("connect", () => {
                this.isRedisConnected = true;
                this.stats.provider = "redis";
                console.log("Redis connected successfully");
            });

            this.redisClient.on("error", () => {
                this.isRedisConnected = false;
                this.stats.provider = "in-memory-fallback";
            });

            this.redisClient.connect().catch(() => {
                this.isRedisConnected = false;
                this.stats.provider = "in-memory-fallback";
            });
        } catch {
            this.isRedisConnected = false;
            this.stats.provider = "in-memory-fallback";
        }
    }

    async get(key) {
        try {
            if (this.isRedisConnected && this.redisClient) {
                const raw = await this.redisClient.get(key);
                if (raw) {
                    this.stats.hits += 1;
                    return JSON.parse(raw);
                }
                this.stats.misses += 1;
                return null;
            }

            const entry = this.memoryStore.get(key);
            if (!entry) {
                this.stats.misses += 1;
                return null;
            }

            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                this.memoryStore.delete(key);
                this.stats.misses += 1;
                return null;
            }

            this.stats.hits += 1;
            return entry.value;
        } catch {
            return null;
        }
    }

    async set(key, value, ttlSeconds = 300) {
        try {
            this.stats.sets += 1;
            if (this.isRedisConnected && this.redisClient) {
                await this.redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
                return true;
            }

            this.memoryStore.set(key, {
                value,
                expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
            });
            return true;
        } catch {
            return false;
        }
    }

    async del(key) {
        try {
            this.stats.deletes += 1;
            if (this.isRedisConnected && this.redisClient) {
                await this.redisClient.del(key);
                return true;
            }
            this.memoryStore.delete(key);
            return true;
        } catch {
            return false;
        }
    }

    async delByPrefix(prefix) {
        try {
            if (this.isRedisConnected && this.redisClient) {
                const keys = await this.redisClient.keys(`${prefix}*`);
                if (keys.length > 0) {
                    await this.redisClient.del(...keys);
                }
                return true;
            }

            for (const key of this.memoryStore.keys()) {
                if (key.startsWith(prefix)) {
                    this.memoryStore.delete(key);
                }
            }
            return true;
        } catch {
            return false;
        }
    }

    async flush() {
        if (this.isRedisConnected && this.redisClient) {
            await this.redisClient.flushdb();
        }
        this.memoryStore.clear();
    }

    getStats() {
        const totalLookups = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            hitRatePercent: totalLookups > 0 ? Number(((this.stats.hits / totalLookups) * 100).toFixed(2)) : 0,
            cachedKeysCount: this.memoryStore.size,
        };
    }
}

const cacheClient = new CacheManager();
module.exports = cacheClient;

