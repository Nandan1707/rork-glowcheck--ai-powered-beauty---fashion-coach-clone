import { CONFIG } from './config';
import { logger } from './logger';
import { storageService } from './storage';
import { networkService } from './network';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp?: number;
}

export interface UserProperties {
  userId: string;
  email?: string;
  name?: string;
  subscriptionTier?: string;
  appVersion?: string;
  platform?: string;
  deviceModel?: string;
}

export interface ScreenViewEvent {
  screenName: string;
  previousScreen?: string;
  duration?: number;
}

class AnalyticsService {
  private sessionId: string;
  private userId?: string;
  private isInitialized = false;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  async initialize(userId?: string): Promise<void> {
    if (this.isInitialized) return;

    this.userId = userId;
    this.isInitialized = true;

    if (CONFIG.FEATURES.ENABLE_ANALYTICS) {
      // Load queued events from storage
      const storedEvents = await storageService.getAnalyticsEvents();
      this.eventQueue.push(...storedEvents);

      // Start periodic flush
      this.startPeriodicFlush();

      logger.info('Analytics: Initialized', { userId, sessionId: this.sessionId });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000); // Flush every 30 seconds
  }

  private async addToQueue(event: AnalyticsEvent): Promise<void> {
    const enrichedEvent: AnalyticsEvent = {
      ...event,
      userId: event.userId || this.userId,
      sessionId: this.sessionId,
      timestamp: event.timestamp || Date.now(),
      properties: {
        ...event.properties,
        appVersion: CONFIG.APP.VERSION,
        platform: 'mobile',
        environment: CONFIG.APP.IS_DEV ? 'development' : 'production',
      },
    };

    this.eventQueue.push(enrichedEvent);

    // Store in local storage as backup
    await storageService.storeAnalyticsEvent(enrichedEvent);

    // Auto-flush if queue gets too large
    if (this.eventQueue.length >= 50) {
      await this.flush();
    }
  }

  async track(eventName: string, properties?: Record<string, any>): Promise<void> {
    if (!CONFIG.FEATURES.ENABLE_ANALYTICS) return;

    try {
      await this.addToQueue({
        name: eventName,
        properties,
      });

      logger.debug('Analytics: Event tracked', { eventName, properties });
    } catch (error) {
      logger.error('Analytics: Failed to track event', error, this.userId);
    }
  }

  async screen(screenName: string, properties?: Record<string, any>): Promise<void> {
    await this.track('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }

  async identify(userId: string, properties?: UserProperties): Promise<void> {
    if (!CONFIG.FEATURES.ENABLE_ANALYTICS) return;

    this.userId = userId;

    await this.track('user_identify', {
      user_id: userId,
      ...properties,
    });

    logger.info('Analytics: User identified', { userId });
  }

  async setUserProperties(properties: Partial<UserProperties>): Promise<void> {
    if (!CONFIG.FEATURES.ENABLE_ANALYTICS) return;

    await this.track('user_properties_set', properties);
  }

  // App lifecycle events
  async appLaunched(): Promise<void> {
    await this.track('app_launched', {
      session_id: this.sessionId,
      launch_time: Date.now(),
    });
  }

  async appBackgrounded(): Promise<void> {
    await this.track('app_backgrounded');
    await this.flush(); // Ensure events are sent before app goes to background
  }

  async appForegrounded(): Promise<void> {
    await this.track('app_foregrounded');
  }

  // Feature usage events
  async glowAnalysisStarted(imageSource: 'camera' | 'gallery'): Promise<void> {
    await this.track('glow_analysis_started', {
      image_source: imageSource,
    });
  }

  async glowAnalysisCompleted(score: number, duration: number): Promise<void> {
    await this.track('glow_analysis_completed', {
      glow_score: score,
      analysis_duration: duration,
    });
  }

  async outfitAnalysisStarted(eventType: string): Promise<void> {
    await this.track('outfit_analysis_started', {
      event_type: eventType,
    });
  }

  async outfitAnalysisCompleted(score: number, eventType: string): Promise<void> {
    await this.track('outfit_analysis_completed', {
      outfit_score: score,
      event_type: eventType,
    });
  }

  async coachingPlanCreated(goal: string, duration: number): Promise<void> {
    await this.track('coaching_plan_created', {
      goal,
      duration_days: duration,
    });
  }

  async taskCompleted(taskType: string, day: number): Promise<void> {
    await this.track('task_completed', {
      task_type: taskType,
      day,
    });
  }

  // Error tracking
  async trackError(error: Error, context?: Record<string, any>): Promise<void> {
    await this.track('error_occurred', {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  }

  // Performance tracking
  async trackPerformance(metric: string, value: number, unit: string): Promise<void> {
    await this.track('performance_metric', {
      metric_name: metric,
      metric_value: value,
      metric_unit: unit,
    });
  }

  // Subscription events
  async subscriptionStarted(tier: string): Promise<void> {
    await this.track('subscription_started', {
      subscription_tier: tier,
    });
  }

  async subscriptionCancelled(tier: string, reason?: string): Promise<void> {
    await this.track('subscription_cancelled', {
      subscription_tier: tier,
      cancellation_reason: reason,
    });
  }

  // Flush events to analytics service
  async flush(): Promise<void> {
    if (!CONFIG.FEATURES.ENABLE_ANALYTICS || this.eventQueue.length === 0) {
      return;
    }

    try {
      const eventsToSend = [...this.eventQueue];
      this.eventQueue = [];

      // In a real app, you would send these to your analytics service
      // For now, we'll just log them
      if (CONFIG.APP.IS_DEV) {
        logger.debug('Analytics: Flushing events', { count: eventsToSend.length });
        eventsToSend.forEach(event => {
          logger.debug('Analytics Event:', event);
        });
      } else {
        // In production, send to analytics service
        // await this.sendToAnalyticsService(eventsToSend);
        logger.info('Analytics: Events flushed', { count: eventsToSend.length });
      }

      // Clear stored events after successful flush
      await storageService.clearAnalyticsEvents();
    } catch (error) {
      logger.error('Analytics: Failed to flush events', error, this.userId);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  private async sendToAnalyticsService(events: AnalyticsEvent[]): Promise<void> {
    // Implement your analytics service integration here
    // Examples: Mixpanel, Amplitude, Firebase Analytics, etc.
    
    try {
      await networkService.post('/analytics/events', {
        events,
        app_version: CONFIG.APP.VERSION,
        session_id: this.sessionId,
      });
    } catch (error) {
      logger.error('Analytics: Failed to send events to service', error, this.userId);
      throw error;
    }
  }

  // Cleanup
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Flush remaining events
    this.flush();
    
    this.isInitialized = false;
    logger.info('Analytics: Service destroyed');
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;