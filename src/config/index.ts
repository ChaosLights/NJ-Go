import Constants from 'expo-constants';

// Configuration file
export const config = {
  // Google Maps API Key
  googleMapsApiKey: Constants.expoConfig?.extra?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || '',
  
  // NJ Transit API configuration
  njTransitApiKey: process.env.NJ_TRANSIT_API_KEY || '',
  njTransitApiUrl: process.env.NJ_TRANSIT_API_URL || 'https://api.njtransit.com/',
  
  // Other configurations
  environment: process.env.ENVIRONMENT || 'development',
  
  // Default map region (New Jersey)
  defaultMapRegion: {
    latitude: 40.2206,
    longitude: -74.7563,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  },
  
  // Default radius for waiting spots (meters)
  defaultWaitingSpotRadius: 50,
  
  // Location update frequency (milliseconds)
  locationUpdateInterval: 5000,
  
  // Heading detection tolerance (degrees)
  headingTolerance: 45,
};

// Validate necessary configuration
export function validateConfig() {
  const errors: string[] = [];
  
  if (!config.googleMapsApiKey) {
    errors.push('Google Maps API Key not set');
  }
  
  if (errors.length > 0) {
    console.warn('Configuration validation failed:', errors);
    return false;
  }
  
  return true;
}