import { CONFIG } from './config';
import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];
  private maxMetrics = 100;

  // Start timing a performance metric
  start(name: string, metadata?: Record<string, any>) {
    if (!CONFIG.FEATURES.ENABLE_PERFORMANCE_MONITORING && !CONFIG.APP.IS_DEV) {
      return;
    }

    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      metadata,
    };

    this.metrics.set(name, metric);
    logger.debug('Performance: Started timing ' + name, metadata);
  }

  // End timing a performance metric
  end(name: string, additionalMetadata?: Record<string, any>) {
    if (!CONFIG.FEATURES.ENABLE_PERFORMANCE_MONITORING && !CONFIG.APP.IS_DEV) {
      return;
    }

    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn('Performance: No metric found for ' + name);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      metadata: { ...metric.metadata, ...additionalMetadata },
    };

    this.completedMetrics.push(completedMetric);
    this.metrics.delete(name);

    // Keep only recent metrics
    if (this.completedMetrics.length > this.maxMetrics) {
      this.completedMetrics = this.completedMetrics.slice(-this.maxMetrics);
    }

    logger.info('Performance: ' + name + ' completed in ' + duration + 'ms', completedMetric.metadata);

    // Send to analytics service in production
    if (CONFIG.FEATURES.ENABLE_ANALYTICS) {
      this.sendToAnalytics(completedMetric);
    }

    return completedMetric;
  }

  // Measure a function execution time
  async measure<T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name, { success: true });
      return result;
    } catch (error) {
      this.end(name, { success: false, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Get performance metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.completedMetrics];
  }

  // Get average duration for a metric name
  getAverageDuration(name: string): number | null {
    const metrics = this.completedMetrics.filter(m => m.name === name && m.duration);
    if (metrics.length === 0) return null;
    
    const total = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / metrics.length;
  }

  // Get slowest operations
  getSlowestOperations(limit: number = 10): PerformanceMetric[] {
    return this.completedMetrics
      .filter(m => m.duration)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit);
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
    this.completedMetrics = [];
  }

  // Send metrics to analytics service
  private sendToAnalytics(metric: PerformanceMetric) {
    // In a real app, you would send this to your analytics service
    // For now, we'll just log it
    if (CONFIG.APP.IS_DEV) {
      console.log('Analytics: Performance metric', metric);
    }
  }

  // Get performance summary
  getSummary(): {
    totalMetrics: number;
    averageDuration: number;
    slowestOperation: PerformanceMetric | null;
    fastestOperation: PerformanceMetric | null;
  } {
    const metricsWithDuration = this.completedMetrics.filter(m => m.duration);
    
    if (metricsWithDuration.length === 0) {
      return {
        totalMetrics: 0,
        averageDuration: 0,
        slowestOperation: null,
        fastestOperation: null,
      };
    }

    const totalDuration = metricsWithDuration.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageDuration = totalDuration / metricsWithDuration.length;
    
    const sortedByDuration = metricsWithDuration.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    
    return {
      totalMetrics: this.completedMetrics.length,
      averageDuration,
      slowestOperation: sortedByDuration[sortedByDuration.length - 1] || null,
      fastestOperation: sortedByDuration[0] || null,
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();
export const performance = performanceMonitor;
export default performanceMonitor;