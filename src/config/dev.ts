// 开发模式配置
export const DEV_CONFIG = {
  // 开发模式开关 - 设置为 true 跳过登录和认证
  SKIP_AUTH: true,
  
  // 模拟用户数据
  MOCK_USER: {
    username: 'dev_user',
    attributes: {
      email: 'developer@njgo.com'
    }
  },
  
  // 开发模式提示
  showDevModeAlert: () => {
    console.log('🚀 NJ Go - 开发模式激活');
  }
};

// 检查是否为开发模式
export const isDevMode = () => {
  return __DEV__ && DEV_CONFIG.SKIP_AUTH;
};