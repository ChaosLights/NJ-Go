import { 
  Location, 
  TravelPlan, 
  TimeSlot, 
  Destination, 
  TransitOption, 
  WaitingSpot,
  TransitStop,
  NJTransitArrival,
  NJTransitRoute 
} from '../types';
import { config } from '../config';
import { cacheService, CacheService } from './CacheService';

export class TransitRecommendationService {
  private static instance: TransitRecommendationService;

  private constructor() {}

  public static getInstance(): TransitRecommendationService {
    if (!TransitRecommendationService.instance) {
      TransitRecommendationService.instance = new TransitRecommendationService();
    }
    return TransitRecommendationService.instance;
  }

  // 获取智能推荐
  public async getRecommendations(
    currentLocation: Location,
    heading: number,
    activeWaitingSpot: WaitingSpot,
    travelPlans: TravelPlan[],
    currentTime: Date = new Date()
  ): Promise<{ [planId: string]: TransitOption[] }> {
    try {
      // 1. 过滤出当前时间段活跃的出行计划
      const activePlans = this.getActiveTravelPlans(travelPlans, currentTime);
      
      if (activePlans.length === 0) {
        return {};
      }

      // 2. 创建缓存键
      const locationHash = cacheService.createLocationHash(currentLocation.latitude, currentLocation.longitude);
      const cacheKey = cacheService.getRecommendationsKey(
        activePlans.map(p => p.id).join(','), 
        locationHash
      );

      // 3. 尝试从缓存获取推荐
      const cachedRecommendations = await cacheService.get<{ [planId: string]: TransitOption[] }>(cacheKey);
      if (cachedRecommendations) {
        console.log('返回缓存的推荐数据');
        return cachedRecommendations;
      }

      // 4. 获取附近的公交到达信息（带缓存）
      const arrivals = await this.getNearbyArrivals(activeWaitingSpot);

      // 5. 为每个计划生成推荐
      const recommendations: { [planId: string]: TransitOption[] } = {};

      for (const plan of activePlans) {
        const planRecommendations = await this.getRecommendationsForPlan(
          plan,
          currentLocation,
          heading,
          activeWaitingSpot,
          arrivals,
          currentTime
        );
        
        recommendations[plan.id] = planRecommendations;
      }

      // 6. 缓存推荐结果
      await cacheService.set(
        cacheKey,
        recommendations,
        { ttl: CacheService.DEFAULT_TTL.TRAVEL_RECOMMENDATIONS }
      );

      return recommendations;
    } catch (error) {
      console.error('获取推荐失败:', error);
      throw error;
    }
  }

  // 获取当前时间段活跃的出行计划
  private getActiveTravelPlans(travelPlans: TravelPlan[], currentTime: Date): TravelPlan[] {
    const now = currentTime;
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const currentTimeStr = this.formatTime(now);

    return travelPlans.filter(plan => {
      if (!plan.isActive) return false;

      // 检查是否有匹配当前时间的时间段
      return plan.timeSlots.some(slot => {
        return slot.dayOfWeek === dayOfWeek &&
               this.isTimeInRange(currentTimeStr, slot.startTime, slot.endTime);
      });
    });
  }

  // 为特定计划生成推荐
  private async getRecommendationsForPlan(
    plan: TravelPlan,
    currentLocation: Location,
    heading: number,
    activeWaitingSpot: WaitingSpot,
    arrivals: NJTransitArrival[],
    currentTime: Date
  ): Promise<TransitOption[]> {
    const recommendations: TransitOption[] = [];
    
    // 获取计划中当前时间段的目的地
    const currentDestinations = this.getCurrentDestinations(plan, currentTime);
    
    if (currentDestinations.length === 0) {
      return recommendations;
    }

    // 为每个到达的交通工具计算推荐分数
    for (const arrival of arrivals) {
      try {
        const option = await this.createTransitOption(
          arrival,
          activeWaitingSpot,
          currentDestinations,
          heading,
          plan.id
        );

        if (option && this.isRelevantDirection(option.heading, heading)) {
          recommendations.push(option);
        }
      } catch (error) {
        console.warn('创建交通选项失败:', error);
      }
    }

    // 按相关性和到达时间排序
    return recommendations.sort((a, b) => {
      // 首先按朝向匹配度排序
      const headingScoreA = this.calculateHeadingScore(a.heading, heading);
      const headingScoreB = this.calculateHeadingScore(b.heading, heading);
      
      if (Math.abs(headingScoreA - headingScoreB) > 0.1) {
        return headingScoreB - headingScoreA;
      }

      // 然后按到达时间排序
      return a.arrivalTime.getTime() - b.arrivalTime.getTime();
    });
  }

  // 获取当前时间段的目的地
  private getCurrentDestinations(plan: TravelPlan, currentTime: Date): Destination[] {
    const dayOfWeek = currentTime.getDay();
    const currentTimeStr = this.formatTime(currentTime);

    const activeTimeSlots = plan.timeSlots.filter(slot => {
      return slot.dayOfWeek === dayOfWeek &&
             this.isTimeInRange(currentTimeStr, slot.startTime, slot.endTime);
    });

    const destinationIds = new Set<string>();
    activeTimeSlots.forEach(slot => {
      slot.destinationIds.forEach(id => destinationIds.add(id));
    });

    return plan.destinations.filter(dest => destinationIds.has(dest.id));
  }

  // 创建交通选项
  private async createTransitOption(
    arrival: NJTransitArrival,
    waitingSpot: WaitingSpot,
    destinations: Destination[],
    currentHeading: number,
    planId: string
  ): Promise<TransitOption | null> {
    try {
      // 查找对应的站点信息
      const stop = waitingSpot.transitStops.find(s => s.id === arrival.stopId);
      if (!stop) {
        return null;
      }

      // 计算到各个目的地的距离和时间
      const destinationDistances = destinations.map(dest => ({
        destination: dest,
        distance: this.calculateDistance(
          { latitude: stop.latitude, longitude: stop.longitude },
          { latitude: dest.latitude, longitude: dest.longitude }
        )
      }));

      // 找到最近的目的地
      const nearestDestination = destinationDistances.reduce((nearest, current) => 
        current.distance < nearest.distance ? current : nearest
      );

      // 估算行程时间（这里应该调用真实的路径规划API）
      const estimatedTravelTime = this.estimateTravelTime(
        nearestDestination.distance,
        arrival.routeId.includes('train') ? 'train' : 'bus'
      );

      // 计算公交方向（这里需要更复杂的逻辑，可能需要调用API）
      const transitHeading = this.estimateTransitHeading(stop, nearestDestination.destination);

      return {
        id: `${arrival.routeId}-${arrival.stopId}-${arrival.arrivalTime.getTime()}`,
        type: arrival.routeId.includes('train') ? 'train' : 'bus',
        line: arrival.routeId,
        direction: arrival.destination,
        stopName: stop.name,
        arrivalTime: arrival.arrivalTime,
        destination: nearestDestination.destination.name,
        estimatedTravelTime,
        matchingPlanIds: [planId],
        distanceToDestination: nearestDestination.distance,
        heading: transitHeading
      };
    } catch (error) {
      console.error('创建交通选项失败:', error);
      return null;
    }
  }

  // 获取附近的公交到达信息（带缓存）
  private async getNearbyArrivals(waitingSpot: WaitingSpot): Promise<NJTransitArrival[]> {
    const cacheKey = cacheService.getTransitArrivalsKey(waitingSpot.id);
    
    // 尝试从缓存获取到达信息
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        // 这里应该调用真实的NJ Transit API
        // 目前返回模拟数据
        console.log('获取新的公交到达信息');
        const mockArrivals: NJTransitArrival[] = [];
        const now = new Date();

        waitingSpot.transitStops.forEach(stop => {
          // 为每条路线生成几个到达时间
          stop.lines.forEach(line => {
            for (let i = 1; i <= 3; i++) {
              const arrivalTime = new Date(now.getTime() + (i * 10 * 60000)); // 10, 20, 30分钟后
              mockArrivals.push({
                routeId: line,
                stopId: stop.id,
                arrivalTime,
                destination: `${line} 终点站`,
                delay: Math.random() > 0.8 ? Math.floor(Math.random() * 5) : undefined
              });
            }
          });
        });

        return mockArrivals.sort((a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime());
      },
      { ttl: CacheService.DEFAULT_TTL.TRANSIT_ARRIVALS }
    );
  }

  // 计算两点间距离
  private calculateDistance(point1: Location, point2: Location): number {
    const R = 6371000; // 地球半径（米）
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLng = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // 估算行程时间
  private estimateTravelTime(distance: number, transportType: 'bus' | 'train'): number {
    // 简化的时间估算，实际应该考虑交通状况、路线等
    const averageSpeed = transportType === 'train' ? 60 : 25; // km/h
    const timeInHours = (distance / 1000) / averageSpeed;
    const timeInMinutes = timeInHours * 60;
    
    // 加上等待和上下车时间
    return Math.round(timeInMinutes + 5);
  }

  // 估算公交方向
  private estimateTransitHeading(stop: TransitStop, destination: Destination): number {
    const dLat = destination.latitude - stop.latitude;
    const dLng = destination.longitude - stop.longitude;
    
    let heading = Math.atan2(dLng, dLat) * (180 / Math.PI);
    if (heading < 0) {
      heading += 360;
    }
    
    return Math.round(heading);
  }

  // 计算朝向匹配分数
  private calculateHeadingScore(transitHeading: number, userHeading: number): number {
    let diff = Math.abs(transitHeading - userHeading);
    if (diff > 180) {
      diff = 360 - diff;
    }
    
    // 差异越小分数越高，最大差异为180度
    return 1 - (diff / 180);
  }

  // 检查是否为相关方向
  private isRelevantDirection(transitHeading: number, userHeading: number): boolean {
    const diff = this.calculateHeadingScore(transitHeading, userHeading);
    return diff > 0.3; // 如果朝向差异小于108度（0.3 * 180）则认为相关
  }

  // 检查时间是否在范围内
  private isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    
    if (start <= end) {
      return current >= start && current <= end;
    } else {
      // 跨午夜的情况
      return current >= start || current <= end;
    }
  }

  // 格式化时间为 HH:MM
  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  // 将时间转换为分钟数
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // 刷新推荐（用于定时更新）
  public async refreshRecommendations(
    currentLocation: Location,
    heading: number,
    activeWaitingSpot: WaitingSpot,
    travelPlans: TravelPlan[]
  ): Promise<{ [planId: string]: TransitOption[] }> {
    return this.getRecommendations(currentLocation, heading, activeWaitingSpot, travelPlans);
  }
}

// 导出单例实例
export const transitRecommendationService = TransitRecommendationService.getInstance();