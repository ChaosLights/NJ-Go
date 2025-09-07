import Constants from 'expo-constants';

// 配置文件
export const config = {
  // Google Maps API Key
  googleMapsApiKey: Constants.expoConfig?.extra?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || '',
  
  // NJ Transit API 配置
  njTransitApiKey: process.env.NJ_TRANSIT_API_KEY || '',
  njTransitApiUrl: process.env.NJ_TRANSIT_API_URL || 'https://api.njtransit.com/',
  
  // 其他配置
  environment: process.env.ENVIRONMENT || 'development',
  
  // 默认地图区域（新泽西州）
  defaultMapRegion: {
    latitude: 40.2206,
    longitude: -74.7563,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  },
  
  // 等车地点默认半径（米）
  defaultWaitingSpotRadius: 50,
  
  // 位置更新频率（毫秒）
  locationUpdateInterval: 5000,
  
  // 朝向检测容忍度（度数）
  headingTolerance: 45,
};

// 验证必要的配置
export function validateConfig() {
  const errors: string[] = [];
  
  if (!config.googleMapsApiKey) {
    errors.push('Google Maps API Key未设置');
  }
  
  if (errors.length > 0) {
    console.warn('配置验证失败:', errors);
    return false;
  }
  
  return true;
}