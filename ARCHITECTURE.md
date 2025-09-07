# NJ Go App 应用架构设计

## 技术栈
- **框架**: Expo React Native
- **认证**: AWS Amplify
- **状态管理**: React Context + useReducer
- **地图**: Google Maps API
- **位置服务**: Expo Location
- **传感器**: Expo Sensors (加速度计，陀螺仪)
- **存储**: AsyncStorage + Amplify DataStore

## 核心功能模块

### 1. 用户认证模块
- 已有AWS Amplify认证
- 用户配置文件管理

### 2. 地图模块 (`/src/components/Map`)
- Google Maps集成
- 地点标记和搜索
- 等车地点选择

### 3. 出行计划模块 (`/src/components/TravelPlan`)
- 创建和编辑出行计划
- 时间段管理
- 目的地管理

### 4. 位置服务模块 (`/src/services/Location`)
- GPS位置获取
- 地理围栏检测 (50m半径)
- 朝向检测

### 5. 交通信息模块 (`/src/services/Transit`)
- NJ Transit API集成
- 实时班次查询
- 路线规划

### 6. 购票模块 (`/src/components/Ticketing`)
- NJ Transit购票API集成
- 票据管理
- 摇动手势检测

### 7. 智能推荐模块 (`/src/services/Recommendations`)
- 基于朝向的交通选项筛选
- 最短路径计算
- 出行计划匹配

## 数据模型

### TravelPlan
```typescript
interface TravelPlan {
  id: string;
  userId: string;
  name: string;
  timeSlots: TimeSlot[];
  destinations: Destination[];
  isActive: boolean;
}

interface TimeSlot {
  id: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  destinations: string[]; // destination IDs
}

interface Destination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
}
```

### WaitingSpot
```typescript
interface WaitingSpot {
  id: string;
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // 默认50m
  transitStops: TransitStop[];
}

interface TransitStop {
  id: string;
  name: string;
  type: 'bus' | 'train';
  latitude: number;
  longitude: number;
  lines: string[]; // 线路名称
}
```

### TransitOption
```typescript
interface TransitOption {
  id: string;
  type: 'bus' | 'train';
  line: string;
  direction: string;
  stopName: string;
  arrivalTime: Date;
  destination: string;
  estimatedTravelTime: number; // 分钟
  matchingPlans: string[]; // 匹配的出行计划ID
}
```

### Ticket
```typescript
interface Ticket {
  id: string;
  userId: string;
  transitOption: TransitOption;
  purchaseTime: Date;
  status: 'purchased' | 'used' | 'expired';
  qrCode?: string;
}
```

## 应用状态结构

```typescript
interface AppState {
  user: User;
  location: {
    current: Location;
    heading: number;
    isInWaitingSpot: boolean;
    activeWaitingSpot?: WaitingSpot;
  };
  travelPlans: TravelPlan[];
  waitingSpots: WaitingSpot[];
  transitOptions: TransitOption[];
  tickets: Ticket[];
  ui: {
    activeTab: string;
    isLoading: boolean;
    error?: string;
  };
}
```

## 主要屏幕流程

1. **主屏幕** - 显示地图和等车地点
2. **出行计划设置** - 创建和管理出行计划
3. **交通选项列表** - 显示实时交通信息（当在等车地点时触发）
4. **购票确认** - 摇动购票和票据显示
5. **票据管理** - 查看和管理已购票据

## API集成

### Google Maps API
- 地图显示
- 地点搜索
- 路线规划

### NJ Transit API
- 实时班次信息
- 票务系统
- 线路信息

## 权限要求
- 位置权限（精确位置）
- 传感器权限（加速度计、陀螺仪）
- 网络权限
- 相机权限（扫码）

## 性能考虑
- 位置更新频率控制
- API调用缓存机制
- 后台任务管理
- 电池优化