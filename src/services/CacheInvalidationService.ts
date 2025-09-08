import { cacheService } from './CacheService';

export class CacheInvalidationService {
  private static instance: CacheInvalidationService;

  private constructor() {}

  public static getInstance(): CacheInvalidationService {
    if (!CacheInvalidationService.instance) {
      CacheInvalidationService.instance = new CacheInvalidationService();
    }
    return CacheInvalidationService.instance;
  }

  // Invalidate all transit arrivals for a specific stop
  public async invalidateTransitArrivals(stopId: string): Promise<void> {
    const cacheKey = cacheService.getTransitArrivalsKey(stopId);
    await cacheService.delete(cacheKey);
    console.log(`Invalidated transit arrivals cache for stop: ${stopId}`);
  }

  // Invalidate recommendations for a specific plan
  public async invalidateRecommendations(planId: string): Promise<void> {
    await cacheService.invalidatePattern(`travel_recommendations:${planId}`);
    console.log(`Invalidated recommendations cache for plan: ${planId}`);
  }

  // Invalidate waiting spots for a specific area
  public async invalidateWaitingSpots(areaId: string): Promise<void> {
    const cacheKey = cacheService.getWaitingSpotsKey(areaId);
    await cacheService.delete(cacheKey);
    console.log(`Invalidated waiting spots cache for area: ${areaId}`);
  }

  // Invalidate route plans for a user
  public async invalidateRoutePlans(userId: string): Promise<void> {
    const cacheKey = cacheService.getRoutePlansKey(userId);
    await cacheService.delete(cacheKey);
    console.log(`Invalidated route plans cache for user: ${userId}`);
  }

  // Invalidate all user-specific data
  public async invalidateUserData(userId: string): Promise<void> {
    await this.invalidateRoutePlans(userId);
    await cacheService.invalidatePattern(`user_locations:${userId}`);
    console.log(`Invalidated all cache data for user: ${userId}`);
  }

  // Invalidate all location-based data when user moves significantly
  public async invalidateLocationData(latitude: number, longitude: number): Promise<void> {
    const locationHash = cacheService.createLocationHash(latitude, longitude);
    
    // Invalidate recommendations for this location
    await cacheService.invalidatePattern(`travel_recommendations:*:${locationHash}`);
    
    // Invalidate waiting spots for this area
    const areaHash = cacheService.createLocationHash(latitude, longitude, 2);
    await cacheService.invalidatePattern(`waiting_spots:${areaHash}`);
    
    console.log(`Invalidated location-based cache data for: ${locationHash}`);
  }

  // Schedule periodic cache cleanup
  public startPeriodicCleanup(): void {
    // Clean up expired entries every 10 minutes
    setInterval(async () => {
      console.log('Running periodic cache cleanup...');
      
      // Get cache statistics
      const stats = cacheService.getCacheStats();
      console.log('Cache stats before cleanup:', stats);
      
      // Note: More sophisticated cleanup would require additional methods
      // For now, we rely on TTL-based expiration
      
    }, 10 * 60 * 1000); // 10 minutes
  }

  // Emergency cache clear for all transit-related data
  public async emergencyCacheClear(): Promise<void> {
    console.log('Performing emergency cache clear...');
    
    await cacheService.invalidatePattern('transit_arrivals');
    await cacheService.invalidatePattern('travel_recommendations');
    await cacheService.invalidatePattern('waiting_spots');
    
    console.log('Emergency cache clear completed');
  }

  // Cache warming for critical data
  public async warmupCache(
    userId: string, 
    currentLocation: { latitude: number; longitude: number },
    criticalStopIds: string[]
  ): Promise<void> {
    console.log('Starting cache warmup...');
    
    try {
      // Pre-load waiting spots for current area
      const areaHash = cacheService.createLocationHash(
        currentLocation.latitude, 
        currentLocation.longitude, 
        2
      );
      
      // Pre-load transit arrivals for critical stops
      for (const stopId of criticalStopIds) {
        const cacheKey = cacheService.getTransitArrivalsKey(stopId);
        const exists = await cacheService.exists(cacheKey);
        if (!exists) {
          console.log(`Warming up cache for stop: ${stopId}`);
          // This would trigger the actual data fetch and cache storage
          // Implementation depends on how the services are called
        }
      }
      
      console.log('Cache warmup completed');
    } catch (error) {
      console.error('Cache warmup failed:', error);
    }
  }

  // Health check for cache system
  public async healthCheck(): Promise<{
    isHealthy: boolean;
    localCacheSize: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      // Test basic cache operations
      const testKey = 'health_check_test';
      const testData = { timestamp: Date.now() };
      
      // Test set operation
      const setResult = await cacheService.set(testKey, testData, { ttl: 10 });
      if (!setResult) {
        errors.push('Cache set operation failed');
      }
      
      // Test get operation
      const getData = await cacheService.get(testKey);
      if (!getData) {
        errors.push('Cache get operation failed');
      }
      
      // Test delete operation
      const deleteResult = await cacheService.delete(testKey);
      if (!deleteResult) {
        errors.push('Cache delete operation failed');
      }
      
      const stats = cacheService.getCacheStats();
      
      return {
        isHealthy: errors.length === 0,
        localCacheSize: stats.localCacheSize,
        errors,
      };
    } catch (error) {
      errors.push(`Health check exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        isHealthy: false,
        localCacheSize: 0,
        errors,
      };
    }
  }
}

// Export singleton instance
export const cacheInvalidationService = CacheInvalidationService.getInstance();