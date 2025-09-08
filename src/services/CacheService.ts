import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

export class CacheService {
  private static instance: CacheService;
  private client = generateClient<Schema>();
  private localCache = new Map<string, CachedData<any>>();
  
  // Cache keys for different data types
  static readonly CACHE_KEYS = {
    TRANSIT_ARRIVALS: 'transit_arrivals',
    TRAVEL_RECOMMENDATIONS: 'travel_recommendations',
    ROUTE_PLANS: 'route_plans',
    WAITING_SPOTS: 'waiting_spots',
    USER_LOCATIONS: 'user_locations',
  };

  // Default TTL values (in seconds)
  static readonly DEFAULT_TTL = {
    TRANSIT_ARRIVALS: 60, // 1 minute - transit data changes frequently
    TRAVEL_RECOMMENDATIONS: 300, // 5 minutes - recommendations can be cached longer
    ROUTE_PLANS: 1800, // 30 minutes - route plans are relatively static
    WAITING_SPOTS: 3600, // 1 hour - waiting spots change infrequently
    USER_LOCATIONS: 30, // 30 seconds - location data should be relatively fresh
  };

  private constructor() {
    // Clean up expired local cache entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredLocalCache();
    }, 5 * 60 * 1000);
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Get data from cache
  public async get<T>(key: string): Promise<T | null> {
    try {
      // First check local cache
      const localData = this.getFromLocalCache<T>(key);
      if (localData !== null) {
        return localData;
      }

      // If not in local cache, try remote cache (ElastiCache via Lambda)
      const remoteData = await this.getFromRemoteCache<T>(key);
      if (remoteData !== null) {
        // Store in local cache for faster access
        this.setInLocalCache(key, remoteData, CacheService.DEFAULT_TTL.TRAVEL_RECOMMENDATIONS);
        return remoteData;
      }

      return null;
    } catch (error) {
      console.error(`Failed to get cache data for key ${key}:`, error);
      return null;
    }
  }

  // Set data in cache
  public async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      const ttl = options.ttl || CacheService.DEFAULT_TTL.TRAVEL_RECOMMENDATIONS;

      // Store in local cache immediately
      this.setInLocalCache(key, data, ttl);

      // Store in remote cache asynchronously
      await this.setInRemoteCache(key, data, ttl);

      return true;
    } catch (error) {
      console.error(`Failed to set cache data for key ${key}:`, error);
      return false;
    }
  }

  // Delete data from cache
  public async delete(key: string): Promise<boolean> {
    try {
      // Remove from local cache
      this.localCache.delete(key);

      // Remove from remote cache
      await this.deleteFromRemoteCache(key);

      return true;
    } catch (error) {
      console.error(`Failed to delete cache data for key ${key}:`, error);
      return false;
    }
  }

  // Check if key exists in cache
  public async exists(key: string): Promise<boolean> {
    try {
      // Check local cache first
      if (this.localCache.has(key)) {
        const cached = this.localCache.get(key)!;
        if (!this.isExpired(cached)) {
          return true;
        }
      }

      // Check remote cache
      return await this.existsInRemoteCache(key);
    } catch (error) {
      console.error(`Failed to check cache existence for key ${key}:`, error);
      return false;
    }
  }

  // Get cache key for transit arrivals
  public getTransitArrivalsKey(stopId: string): string {
    return `${CacheService.CACHE_KEYS.TRANSIT_ARRIVALS}:${stopId}`;
  }

  // Get cache key for travel recommendations
  public getRecommendationsKey(planId: string, locationHash: string): string {
    return `${CacheService.CACHE_KEYS.TRAVEL_RECOMMENDATIONS}:${planId}:${locationHash}`;
  }

  // Get cache key for route plans
  public getRoutePlansKey(userId: string): string {
    return `${CacheService.CACHE_KEYS.ROUTE_PLANS}:${userId}`;
  }

  // Get cache key for waiting spots
  public getWaitingSpotsKey(areaId: string): string {
    return `${CacheService.CACHE_KEYS.WAITING_SPOTS}:${areaId}`;
  }

  // Helper method to create location hash for cache keys
  public createLocationHash(latitude: number, longitude: number, precision: number = 3): string {
    const lat = latitude.toFixed(precision);
    const lng = longitude.toFixed(precision);
    return `${lat},${lng}`;
  }

  // Local cache operations
  private getFromLocalCache<T>(key: string): T | null {
    const cached = this.localCache.get(key);
    if (cached && !this.isExpired(cached)) {
      return cached.data;
    }

    if (cached && this.isExpired(cached)) {
      this.localCache.delete(key);
    }

    return null;
  }

  private setInLocalCache<T>(key: string, data: T, ttl: number): void {
    this.localCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private isExpired(cached: CachedData<any>): boolean {
    if (!cached.ttl) return false;
    return Date.now() - cached.timestamp > cached.ttl * 1000;
  }

  private cleanupExpiredLocalCache(): void {
    for (const [key, cached] of this.localCache.entries()) {
      if (this.isExpired(cached)) {
        this.localCache.delete(key);
      }
    }
  }

  // Remote cache operations via Lambda
  private async getFromRemoteCache<T>(key: string): Promise<T | null> {
    try {
      const response = await this.client.queries.cacheLayer({
        action: 'get',
        key,
      });

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.warn('Remote cache get failed, falling back to local cache only:', error);
      return null;
    }
  }

  private async setInRemoteCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await this.client.queries.cacheLayer({
        action: 'set',
        key,
        value: JSON.stringify(data),
        ttl,
      });
    } catch (error) {
      console.warn('Remote cache set failed, data stored locally only:', error);
    }
  }

  private async deleteFromRemoteCache(key: string): Promise<void> {
    try {
      await this.client.queries.cacheLayer({
        action: 'del',
        key,
      });
    } catch (error) {
      console.warn('Remote cache delete failed:', error);
    }
  }

  private async existsInRemoteCache(key: string): Promise<boolean> {
    try {
      const response = await this.client.queries.cacheLayer({
        action: 'exists',
        key,
      });

      return response.data?.success && response.data?.data === true;
    } catch (error) {
      console.warn('Remote cache exists check failed:', error);
      return false;
    }
  }

  // Utility methods for common caching patterns
  
  // Get or set pattern - get data from cache or execute callback and cache result
  public async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    let cachedData = await this.get<T>(key);
    
    if (cachedData !== null) {
      return cachedData;
    }

    // Data not in cache, execute callback
    const freshData = await callback();
    await this.set(key, freshData, options);
    
    return freshData;
  }

  // Invalidate related cache entries
  public async invalidatePattern(pattern: string): Promise<void> {
    // For local cache, remove matching keys
    for (const key of this.localCache.keys()) {
      if (key.includes(pattern)) {
        this.localCache.delete(key);
      }
    }

    // For remote cache, we'd need to implement pattern matching in the Lambda
    // For now, we'll just log the pattern for manual cleanup if needed
    console.log(`Cache invalidation requested for pattern: ${pattern}`);
  }

  // Clear all cache
  public async clear(): Promise<void> {
    this.localCache.clear();
    console.log('Local cache cleared');
    // Note: Remote cache clearing would require additional Lambda functionality
  }

  // Get cache statistics
  public getCacheStats() {
    return {
      localCacheSize: this.localCache.size,
      localCacheKeys: Array.from(this.localCache.keys()),
    };
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();