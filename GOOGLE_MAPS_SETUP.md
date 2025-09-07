# Google Maps API 设置指南

## 🗺️ 获取 Google Maps API Key

### 1. 访问 Google Cloud Console
- 打开 [Google Cloud Console](https://console.cloud.google.com/)
- 登录你的 Google 账户

### 2. 创建或选择项目
- 如果没有项目，点击 "Select a project" → "New Project"
- 输入项目名称（如："NJGo"）
- 点击 "Create"

### 3. 启用必要的 API
在 Google Cloud Console 中启用以下 API：
- **Maps SDK for Android**
- **Maps SDK for iOS** 
- **Maps JavaScript API** (用于 Web)
- **Places API** (如果需要地点搜索功能)
- **Directions API** (如果需要路线规划功能)

步骤：
1. 在左侧菜单中选择 "APIs & Services" → "Library"
2. 搜索并启用上述 API

### 4. 创建 API Key
1. 在左侧菜单中选择 "APIs & Services" → "Credentials"
2. 点击 "Create Credentials" → "API Key"
3. 复制生成的 API Key

### 5. 限制 API Key（推荐）
为了安全，建议限制 API Key 的使用：

**应用程序限制**：
- 选择 "Android apps" 并添加你的包名：`com.anonymous.NJGo`
- 选择 "iOS apps" 并添加你的 Bundle ID

**API 限制**：
- 选择 "Restrict key"
- 勾选你启用的 API

## 🔧 在项目中配置 API Key

### 方法 1: 使用 .env 文件（推荐）
1. 在项目根目录的 `.env` 文件中设置：
```bash
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 方法 2: 在 app.json 中设置
```json
{
  "expo": {
    "extra": {
      "googleMapsApiKey": "your_actual_api_key_here"
    }
  }
}
```

### 方法 3: 使用 Expo Secrets（生产环境推荐）
```bash
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value your_actual_api_key_here
```

## 📱 平台特定配置

### Android
在 `app.json` 中添加：
```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "your_android_api_key"
        }
      }
    }
  }
}
```

### iOS
在 `app.json` 中添加：
```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "your_ios_api_key"
      }
    }
  }
}
```

## ⚠️ 重要注意事项

1. **不要将 API Key 提交到版本控制系统**
   - 将 `.env` 文件添加到 `.gitignore`
   - 使用环境变量或 Expo Secrets

2. **API 使用配额和费用**
   - Google Maps API 有免费配额
   - 超出配额后会产生费用
   - 建议设置使用限制和预算警报

3. **测试 API Key**
   ```javascript
   // 在组件中测试
   import { config } from '../config';
   console.log('Google Maps API Key:', config.googleMapsApiKey);
   ```

## 🚀 使用示例

API Key 配置完成后，应用中的地图组件将自动使用该 Key：

```typescript
// src/components/Map/MapView.tsx
import { config } from '../../config';

// 地图会自动使用配置的 API Key
<MapView
  region={region}
  // Google Maps 会使用 config.googleMapsApiKey
/>
```

## 🔍 故障排除

如果地图无法加载，检查：
1. API Key 是否正确设置
2. 相关 API 是否已启用
3. API Key 限制是否正确配置
4. 是否超出了使用配额

检查 Expo Dev Tools 或设备日志获取详细错误信息。