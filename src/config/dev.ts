// Development mode configuration
export const DEV_CONFIG = {
  // Development mode switch - set to true to skip login and authentication
  SKIP_AUTH: false,
  
  // Mock user data
  MOCK_USER: {
    username: 'dev_user',
    attributes: {
      email: 'developer@njgo.com'
    }
  },
  
  // Development mode prompt
  showDevModeAlert: () => {
    console.log('🚀 NJ Go - Development mode activated');
  }
};

// Check if in development mode
export const isDevMode = () => {
  return __DEV__ && DEV_CONFIG.SKIP_AUTH;
};