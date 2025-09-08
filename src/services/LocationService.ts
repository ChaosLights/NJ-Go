import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { AppState, Platform } from 'react-native';
import { Location as LocationType, WaitingSpot, LocationState } from '../types';
import { config } from '../config';
import { cacheService, CacheService } from './CacheService';

export class LocationService {
  private static instance: LocationService;
  private watchId: Location.LocationSubscription | null = null;
  private magnetometerSubscription: { remove: () => void } | null = null;
  private locationCallbacks: ((location: LocationType) => void)[] = [];
  private headingCallbacks: ((heading: number) => void)[] = [];
  private waitingSpotCallbacks: ((isInSpot: boolean, spot: WaitingSpot | null) => void)[] = [];
  
  private currentLocation: LocationType | null = null;
  private currentHeading: number = 0;
  private isWatchingLocation: boolean = false;
  private isWatchingHeading: boolean = false;
  private waitingSpots: WaitingSpot[] = [];
  private currentWaitingSpot: WaitingSpot | null = null;
  private isInWaitingSpot: boolean = false;

  private constructor() {
    this.setupAppStateListener();
  }

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  private setupAppStateListener() {
    const subscription = AppState.addEventListener('change', this.handleAppStateChange);
    // Store subscription for cleanup if needed
  }

  private handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'background') {
      // App entered background, continue location monitoring
      console.log('App entered background, continuing location monitoring');
    } else if (nextAppState === 'active') {
      // App returned to foreground
      console.log('App became active');
      this.refreshLocation();
    }
  };

  // Request location permissions
  public async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.error('Foreground location permission denied');
        return false;
      }

      // Request background location permission
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied, will only monitor location in foreground');
      }

      return true;
    } catch (error) {
      console.error('Failed to request location permissions:', error);
      return false;
    }
  }

  // Get current location
  public async getCurrentLocation(): Promise<LocationType> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const result: LocationType = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      this.currentLocation = result;
      this.notifyLocationCallbacks(result);

      return result;
    } catch (error) {
      console.error('Failed to get current location:', error);
      throw error;
    }
  }

  // Start monitoring location changes
  public async startWatchingLocation(): Promise<() => void> {
    if (this.isWatchingLocation) {
      return this.stopWatchingLocation.bind(this);
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: config.locationUpdateInterval,
          distanceInterval: 10, // Update only when moved 10 meters
        },
        (location) => {
          const newLocation: LocationType = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          this.currentLocation = newLocation;
          this.notifyLocationCallbacks(newLocation);
          this.checkWaitingSpots(newLocation);
        }
      );

      this.isWatchingLocation = true;
      console.log('Starting location monitoring');

      return this.stopWatchingLocation.bind(this);
    } catch (error) {
      console.error('Failed to start location monitoring:', error);
      throw error;
    }
  }

  // Stop location monitoring
  public stopWatchingLocation() {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
      this.isWatchingLocation = false;
      console.log('Stopping location monitoring');
    }
  }

  // Get current heading
  public async getCurrentHeading(): Promise<number> {
    // Web platform does not support magnetometer
    if (Platform.OS === 'web') {
      console.warn('Heading detection not supported on web platform, returning default heading 0');
      return 0;
    }

    return new Promise((resolve, reject) => {
      try {
        const subscription = Magnetometer.addListener((data) => {
          const heading = this.calculateHeading(data.x, data.y, data.z);
          this.currentHeading = heading;
          subscription && subscription.remove();
          resolve(heading);
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          subscription && subscription.remove();
          reject(new Error('Get heading timeout'));
        }, 5000);
      } catch (error) {
        console.error('Failed to get heading:', error);
        reject(error);
      }
    });
  }

  // Start monitoring heading changes
  public startWatchingHeading(): () => void {
    if (this.isWatchingHeading) {
      return this.stopWatchingHeading.bind(this);
    }

    // Web platform does not support magnetometer
    if (Platform.OS === 'web') {
      console.warn('Heading monitoring not supported on web platform');
      this.isWatchingHeading = true;
      return this.stopWatchingHeading.bind(this);
    }

    try {
      Magnetometer.setUpdateInterval(1000); // Update once per second

      this.magnetometerSubscription = Magnetometer.addListener((data) => {
        const heading = this.calculateHeading(data.x, data.y, data.z);
        this.currentHeading = heading;
        this.notifyHeadingCallbacks(heading);
      });

      this.isWatchingHeading = true;
      console.log('Starting heading monitoring');
    } catch (error) {
      console.error('Failed to start heading monitoring:', error);
      this.isWatchingHeading = false;
    }

    return this.stopWatchingHeading.bind(this);
  }

  // Stop heading monitoring
  public stopWatchingHeading() {
    if (this.magnetometerSubscription) {
      this.magnetometerSubscription.remove();
      this.magnetometerSubscription = null;
      this.isWatchingHeading = false;
      console.log('Stopping heading monitoring');
    }
  }

  // Calculate heading angle
  private calculateHeading(x: number, y: number, z: number): number {
    // Use magnetometer data to calculate heading
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    
    // Convert to 0-360 degree range
    if (angle < 0) {
      angle += 360;
    }

    // Convert to geographic azimuth (north is 0 degrees)
    angle = (angle + 90) % 360;
    
    return Math.round(angle);
  }

  // Set waiting spots list
  public async setWaitingSpots(spots: WaitingSpot[]) {
    const activeSpots = spots.filter(spot => spot.isActive);
    this.waitingSpots = activeSpots;
    
    // Cache the waiting spots data
    if (this.currentLocation) {
      const locationHash = cacheService.createLocationHash(
        this.currentLocation.latitude, 
        this.currentLocation.longitude,
        2 // Less precision for area-based caching
      );
      const cacheKey = cacheService.getWaitingSpotsKey(locationHash);
      await cacheService.set(
        cacheKey,
        activeSpots,
        { ttl: CacheService.DEFAULT_TTL.WAITING_SPOTS }
      );
    }
    
    // Recheck current location
    if (this.currentLocation) {
      this.checkWaitingSpots(this.currentLocation);
    }
  }

  // Get cached waiting spots for a location
  public async getCachedWaitingSpots(location: LocationType): Promise<WaitingSpot[] | null> {
    const locationHash = cacheService.createLocationHash(
      location.latitude, 
      location.longitude,
      2
    );
    const cacheKey = cacheService.getWaitingSpotsKey(locationHash);
    return await cacheService.get<WaitingSpot[]>(cacheKey);
  }

  // Check if within waiting spot range
  private checkWaitingSpots(location: LocationType) {
    let isInAnySpot = false;
    let activeSpot: WaitingSpot | null = null;

    for (const spot of this.waitingSpots) {
      const distance = this.calculateDistance(location, {
        latitude: spot.latitude,
        longitude: spot.longitude,
      });

      if (distance <= spot.radius) {
        isInAnySpot = true;
        activeSpot = spot;
        break; // Found first matching waiting spot
      }
    }

    // Notify callbacks when state changes
    if (isInAnySpot !== this.isInWaitingSpot || activeSpot?.id !== this.currentWaitingSpot?.id) {
      this.isInWaitingSpot = isInAnySpot;
      this.currentWaitingSpot = activeSpot;
      this.notifyWaitingSpotCallbacks(isInAnySpot, activeSpot);
    }
  }

  // Calculate distance between two points (meters)
  private calculateDistance(point1: LocationType, point2: LocationType): number {
    const R = 6371000; // Earth radius (meters)
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLng = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Add location change callback
  public onLocationChange(callback: (location: LocationType) => void): () => void {
    this.locationCallbacks.push(callback);
    return () => {
      this.locationCallbacks = this.locationCallbacks.filter(cb => cb !== callback);
    };
  }

  // Add heading change callback
  public onHeadingChange(callback: (heading: number) => void): () => void {
    this.headingCallbacks.push(callback);
    return () => {
      this.headingCallbacks = this.headingCallbacks.filter(cb => cb !== callback);
    };
  }

  // Add waiting spot status change callback
  public onWaitingSpotChange(callback: (isInSpot: boolean, spot: WaitingSpot | null) => void): () => void {
    this.waitingSpotCallbacks.push(callback);
    return () => {
      this.waitingSpotCallbacks = this.waitingSpotCallbacks.filter(cb => cb !== callback);
    };
  }

  // Notify location callbacks
  private notifyLocationCallbacks(location: LocationType) {
    this.locationCallbacks.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('Location callback execution failed:', error);
      }
    });
  }

  // Notify heading callbacks
  private notifyHeadingCallbacks(heading: number) {
    this.headingCallbacks.forEach(callback => {
      try {
        callback(heading);
      } catch (error) {
        console.error('Heading callback execution failed:', error);
      }
    });
  }

  // Notify waiting spot status callbacks
  private notifyWaitingSpotCallbacks(isInSpot: boolean, spot: WaitingSpot | null) {
    this.waitingSpotCallbacks.forEach(callback => {
      try {
        callback(isInSpot, spot);
      } catch (error) {
        console.error('Waiting spot status callback execution failed:', error);
      }
    });
  }

  // Refresh location information
  private async refreshLocation() {
    if (this.isWatchingLocation) {
      try {
        await this.getCurrentLocation();
      } catch (error) {
        console.error('Failed to refresh location:', error);
      }
    }
  }

  // Get current state
  public getCurrentState(): LocationState {
    return {
      current: this.currentLocation,
      heading: this.currentHeading,
      isInWaitingSpot: this.isInWaitingSpot,
      activeWaitingSpot: this.currentWaitingSpot,
      accuracy: 0, // TODO: Add accuracy information
      lastUpdate: this.currentLocation ? new Date() : null,
    };
  }

  // Clean up resources
  public cleanup() {
    this.stopWatchingLocation();
    this.stopWatchingHeading();
    this.locationCallbacks = [];
    this.headingCallbacks = [];
    this.waitingSpotCallbacks = [];
    // Note: AppState.removeEventListener is deprecated, use subscription.remove() instead
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance();