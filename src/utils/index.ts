import { Location } from '../types';

/**
 * 计算两个地理坐标之间的距离（米）
 * 使用 Haversine 公式
 */
export function calculateDistance(
  coord1: Location,
  coord2: Location
): number {
  const R = 6371000; // 地球半径（米）
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLatRad = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLonRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 计算从点1到点2的方位角（度数，0-360）
 */
export function calculateBearing(
  coord1: Location,
  coord2: Location
): number {
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLonRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

  const bearingRad = Math.atan2(y, x);
  const bearingDeg = ((bearingRad * 180) / Math.PI + 360) % 360;

  return bearingDeg;
}

/**
 * 检查是否在指定半径内
 */
export function isWithinRadius(
  center: Location,
  point: Location,
  radius: number
): boolean {
  return calculateDistance(center, point) <= radius;
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * 格式化时间为HH:mm格式
 */
export function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * 解析HH:mm格式的时间字符串
 */
export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * 检查当前时间是否在时间段内
 */
export function isTimeInSlot(
  currentTime: Date,
  startTime: string,
  endTime: string
): boolean {
  const current = currentTime.getHours() * 60 + currentTime.getMinutes();
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  if (startMinutes <= endMinutes) {
    // 同一天内
    return current >= startMinutes && current <= endMinutes;
  } else {
    // 跨越午夜
    return current >= startMinutes || current <= endMinutes;
  }
}

/**
 * 获取当前星期几（0=周日，1=周一...）
 */
export function getCurrentDayOfWeek(): number {
  return new Date().getDay();
}

/**
 * 计算两个角度之间的最小差值
 */
export function angleDifference(angle1: number, angle2: number): number {
  let diff = Math.abs(angle1 - angle2);
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

/**
 * 检查朝向是否朝向目的地（允许±45度误差）
 */
export function isHeadingTowards(
  userHeading: number,
  bearingToDestination: number,
  tolerance: number = 45
): boolean {
  return angleDifference(userHeading, bearingToDestination) <= tolerance;
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查时间是否过期
 */
export function isExpired(date: Date): boolean {
  return new Date() > date;
}

/**
 * 获取相对时间描述
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 0) {
    return '已过期';
  } else if (minutes === 0) {
    return '即将到达';
  } else if (minutes === 1) {
    return '1分钟';
  } else if (minutes < 60) {
    return `${minutes}分钟`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}小时${remainingMinutes}分钟`;
  }
}