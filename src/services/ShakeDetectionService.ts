import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export interface ShakeDetectionOptions {
  threshold?: number; // Shake threshold
  timeWindow?: number; // Time window (milliseconds)
  minShakeCount?: number; // Minimum shake count
  cooldownTime?: number; // Cooldown time (milliseconds)
}

export class ShakeDetectionService {
  private static instance: ShakeDetectionService;
  
  private subscription: any = null;
  private isListening: boolean = false;
  private callbacks: Array<() => void> = [];
  
  // Configuration parameters
  private threshold: number = 1.5; // Acceleration threshold
  private timeWindow: number = 1000; // 1 second time window
  private minShakeCount: number = 3; // Minimum 3 shakes
  private cooldownTime: number = 2000; // 2 second cooldown time
  
  // State variables
  private shakeEvents: number[] = [];
  private lastShakeTime: number = 0;
  private previousAcceleration: { x: number; y: number; z: number } | null = null;
  
  private constructor() {}

  public static getInstance(): ShakeDetectionService {
    if (!ShakeDetectionService.instance) {
      ShakeDetectionService.instance = new ShakeDetectionService();
    }
    return ShakeDetectionService.instance;
  }

  // Configure shake detection parameters
  public configure(options: ShakeDetectionOptions) {
    this.threshold = options.threshold || this.threshold;
    this.timeWindow = options.timeWindow || this.timeWindow;
    this.minShakeCount = options.minShakeCount || this.minShakeCount;
    this.cooldownTime = options.cooldownTime || this.cooldownTime;
  }

  // Start listening for shakes
  public startListening(): () => void {
    if (this.isListening) {
      return this.stopListening.bind(this);
    }

    // Web platform does not support accelerometer, return empty cleanup function
    if (Platform.OS === 'web') {
      console.warn('Shake detection not supported on web platform');
      this.isListening = true;
      return this.stopListening.bind(this);
    }

    try {
      // Set update frequency to 100ms
      Accelerometer.setUpdateInterval(100);

      this.subscription = Accelerometer.addListener((accelerometerData) => {
        this.processAccelerometerData(accelerometerData);
      });

      this.isListening = true;
      console.log('Starting shake detection');
    } catch (error) {
      console.error('Failed to start shake detection:', error);
      this.isListening = false;
    }

    return this.stopListening.bind(this);
  }

  // Stop listening for shakes
  public stopListening() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
      this.isListening = false;
      this.shakeEvents = [];
      this.previousAcceleration = null;
      console.log('Stopping shake detection');
    }
  }

  // Process accelerometer data
  private processAccelerometerData(data: { x: number; y: number; z: number }) {
    const currentTime = Date.now();
    
    // If in cooldown time, ignore shake
    if (currentTime - this.lastShakeTime < this.cooldownTime) {
      return;
    }

    if (this.previousAcceleration) {
      // Calculate acceleration change
      const deltaX = Math.abs(data.x - this.previousAcceleration.x);
      const deltaY = Math.abs(data.y - this.previousAcceleration.y);
      const deltaZ = Math.abs(data.z - this.previousAcceleration.z);
      
      // Calculate total acceleration change
      const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
      
      // If exceeds threshold, record as one shake
      if (totalDelta > this.threshold) {
        this.shakeEvents.push(currentTime);
        
        // Clean up events outside time window
        this.cleanupOldEvents(currentTime);
        
        // Check if shake conditions are met
        if (this.shakeEvents.length >= this.minShakeCount) {
          this.triggerShake(currentTime);
        }
      }
    }

    this.previousAcceleration = { ...data };
  }

  // Clean up expired shake events
  private cleanupOldEvents(currentTime: number) {
    this.shakeEvents = this.shakeEvents.filter(
      time => currentTime - time <= this.timeWindow
    );
  }

  // Trigger shake event
  private triggerShake(currentTime: number) {
    this.lastShakeTime = currentTime;
    this.shakeEvents = []; // Clear event list
    
    // Trigger haptic feedback (only on non-web platforms)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
        // Ignore haptic feedback errors
      });
    }
    
    console.log('Shake gesture detected');
    
    // Notify all callbacks
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Shake callback execution failed:', error);
      }
    });
  }

  // Add shake event callback
  public onShake(callback: () => void): () => void {
    this.callbacks.push(callback);
    
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  // Get current status
  public getStatus() {
    return {
      isListening: this.isListening,
      recentShakeCount: this.shakeEvents.length,
      lastShakeTime: this.lastShakeTime,
      isInCooldown: Date.now() - this.lastShakeTime < this.cooldownTime,
    };
  }

  // Manually trigger shake (for testing)
  public manualTrigger() {
    if (Date.now() - this.lastShakeTime >= this.cooldownTime) {
      this.triggerShake(Date.now());
    }
  }

  // Clean up resources
  public cleanup() {
    this.stopListening();
    this.callbacks = [];
  }
}

// Export singleton instance
export const shakeDetectionService = ShakeDetectionService.getInstance();