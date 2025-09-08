import { useState, useEffect, useContext, useCallback } from 'react';
import { AppState } from 'react-native';
import { locationService } from '../services/LocationService';
import { AppContext } from '../contexts/AppContext';
import { Location, LocationState, WaitingSpot } from '../types';

export interface UseLocationOptions {
  enableBackground?: boolean;
  enableHeading?: boolean;
  enableWaitingSpotDetection?: boolean;
  onEnterWaitingSpot?: (spot: WaitingSpot) => void;
  onLeaveWaitingSpot?: (spot: WaitingSpot) => void;
}

export function useLocation(options: UseLocationOptions = {}) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useLocation must be used within AppProvider');
  }
  const { state, dispatch } = context;
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown');

  const {
    enableBackground = true,
    enableHeading = true,
    enableWaitingSpotDetection = true,
    onEnterWaitingSpot,
    onLeaveWaitingSpot
  } = options;

  // Initialize location service
  const initialize = useCallback(async () => {
    if (isInitialized) return;

    setIsLoading(true);
    setError(null);

    try {
      // Request permissions
      const hasPermission = await locationService.requestPermissions();
      setPermissionStatus(hasPermission ? 'granted' : 'denied');

      if (!hasPermission) {
        setError('Location permission denied');
        return;
      }

      // Get current location
      const currentLocation = await locationService.getCurrentLocation();
      
      // Get current heading (if enabled)
      let currentHeading = 0;
      if (enableHeading) {
        try {
          currentHeading = await locationService.getCurrentHeading();
        } catch (headingError) {
          console.warn('Failed to get heading:', headingError);
        }
      }

      // Update state
      const locationState: LocationState = {
        current: currentLocation,
        heading: currentHeading,
        isInWaitingSpot: false,
        activeWaitingSpot: null,
        accuracy: 0,
        lastUpdate: new Date(),
      };

      dispatch({ type: 'SET_LOCATION', payload: locationState });
      setIsInitialized(true);

    } catch (err) {
      console.error('Location service initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Location service initialization failed');
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, enableHeading, dispatch]);

  // Start watching
  const startWatching = useCallback(async () => {
    if (!isInitialized) {
      await initialize();
    }

    if (permissionStatus !== 'granted') {
      throw new Error('No location permission');
    }

    try {
      // Set waiting spots
      if (enableWaitingSpotDetection) {
        locationService.setWaitingSpots(state.waitingSpots);
      }

      // Start location monitoring
      const stopLocationWatch = await locationService.startWatchingLocation();

      // Start heading monitoring (if enabled)
      let stopHeadingWatch: (() => void) | null = null;
      if (enableHeading) {
        stopHeadingWatch = locationService.startWatchingHeading();
      }

      return () => {
        stopLocationWatch();
        if (stopHeadingWatch) {
          stopHeadingWatch();
        }
      };
    } catch (err) {
      console.error('Location monitoring startup failed:', err);
      setError(err instanceof Error ? err.message : 'Location monitoring startup failed');
      throw err;
    }
  }, [isInitialized, initialize, permissionStatus, enableHeading, enableWaitingSpotDetection, state.waitingSpots]);

  // Stop watching
  const stopWatching = useCallback(() => {
    locationService.stopWatchingLocation();
    if (enableHeading) {
      locationService.stopWatchingHeading();
    }
  }, [enableHeading]);

  // Manually refresh location
  const refreshLocation = useCallback(async () => {
    if (permissionStatus !== 'granted') {
      throw new Error('No location permission');
    }

    try {
      setIsLoading(true);
      const location = await locationService.getCurrentLocation();
      
      const updatedState: LocationState = {
        ...state.location,
        current: location,
        lastUpdate: new Date(),
      };

      dispatch({ type: 'SET_LOCATION', payload: updatedState });
    } catch (err) {
      console.error('Location refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Location refresh failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [permissionStatus, state.location, dispatch]);

  // Set location callback
  useEffect(() => {
    const unsubscribeLocation = locationService.onLocationChange((location: Location) => {
      const updatedState: LocationState = {
        ...state.location,
        current: location,
        lastUpdate: new Date(),
      };
      dispatch({ type: 'SET_LOCATION', payload: updatedState });
    });

    return unsubscribeLocation;
  }, [state.location, dispatch]);

  // Set heading callback (if enabled)
  useEffect(() => {
    if (!enableHeading) return;

    const unsubscribeHeading = locationService.onHeadingChange((heading: number) => {
      const updatedState: LocationState = {
        ...state.location,
        heading,
      };
      dispatch({ type: 'SET_LOCATION', payload: updatedState });
    });

    return unsubscribeHeading;
  }, [enableHeading, state.location, dispatch]);

  // Set waiting spot callback (if enabled)
  useEffect(() => {
    if (!enableWaitingSpotDetection) return;

    const unsubscribeWaitingSpot = locationService.onWaitingSpotChange(
      (isInSpot: boolean, spot: WaitingSpot | null) => {
        const updatedState: LocationState = {
          ...state.location,
          isInWaitingSpot: isInSpot,
          activeWaitingSpot: spot,
        };

        dispatch({ type: 'SET_LOCATION', payload: updatedState });

        // Trigger callbacks
        if (isInSpot && spot && onEnterWaitingSpot) {
          onEnterWaitingSpot(spot);
        } else if (!isInSpot && spot && onLeaveWaitingSpot) {
          onLeaveWaitingSpot(spot);
        }
      }
    );

    return unsubscribeWaitingSpot;
  }, [enableWaitingSpotDetection, state.location, dispatch, onEnterWaitingSpot, onLeaveWaitingSpot]);

  // Update service when waiting spots list changes
  useEffect(() => {
    if (enableWaitingSpotDetection && isInitialized) {
      locationService.setWaitingSpots(state.waitingSpots);
    }
  }, [state.waitingSpots, enableWaitingSpotDetection, isInitialized]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (isInitialized) {
        stopWatching();
      }
    };
  }, [isInitialized, stopWatching]);

  return {
    // State
    location: state.location.current,
    heading: state.location.heading,
    isInWaitingSpot: state.location.isInWaitingSpot,
    activeWaitingSpot: state.location.activeWaitingSpot,
    accuracy: state.location.accuracy,
    lastUpdate: state.location.lastUpdate,
    
    // Control state
    isInitialized,
    isLoading,
    error,
    permissionStatus,
    
    // Methods
    initialize,
    startWatching,
    stopWatching,
    refreshLocation,
    
    // Clear error
    clearError: () => setError(null),
  };
}

// Auto-starting location Hook
export function useAutoLocation(options: UseLocationOptions = {}) {
  const locationHook = useLocation(options);

  // Auto initialize and start watching
  useEffect(() => {
    let cleanupFn: (() => void) | null = null;

    const startAutoWatching = async () => {
      try {
        cleanupFn = await locationHook.startWatching();
      } catch (error) {
        console.error('Auto location monitoring startup failed:', error);
      }
    };

    // Start monitoring when app launches
    startAutoWatching();

    // Handle app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && !locationHook.isLoading) {
        // Refresh location when app returns to foreground
        locationHook.refreshLocation().catch(console.error);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
      subscription?.remove();
    };
  }, []);

  return locationHook;
}