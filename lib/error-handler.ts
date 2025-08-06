import { CONFIG } from './config';
import { logger } from './logger';
import { analyticsService } from './analytics';
import { storageService } from './storage';

export interface ErrorReport {
  id: string;
  error: Error;
  context: ErrorContext;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  handled: boolean;
}

export interface ErrorContext {
  screen?: string;
  action?: string;
  component?: string;
  props?: Record<string, any>;
  state?: Record<string, any>;
  userAgent?: string;
  appVersion?: string;
  buildNumber?: string;
  userId?: string;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

class ErrorHandler {
  private errorReports: ErrorReport[] = [];
  private maxReports = 100;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    // Load stored error reports
    await this.loadStoredReports();
    
    this.isInitialized = true;
    logger.info('ErrorHandler: Initialized');
  }

  private setupGlobalErrorHandlers(): void {
    try {
      // Handle unhandled promise rejections (Web only)
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('unhandledrejection', (event) => {
          this.handleError(new Error(event.reason), {
            action: 'unhandled_promise_rejection',
            component: 'global',
          }, 'high', false);
        });

        // Handle global JavaScript errors (Web only)
        window.addEventListener('error', (event) => {
          this.handleError(event.error || new Error(event.message), {
            action: 'global_javascript_error',
            component: 'global',
          }, 'high', false);
        });
      }

      // React Native specific error handling
      if (typeof global !== 'undefined' && (global as any).ErrorUtils) {
        const originalHandler = (global as any).ErrorUtils.getGlobalHandler();
        
        (global as any).ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
          this.handleError(error, {
            action: 'react_native_error',
            component: 'global',
          }, isFatal ? 'critical' : 'high', false);
          
          // Call original handler
          if (originalHandler) {
            originalHandler(error, isFatal);
          }
        });
      }

      // Handle unhandled promise rejections for React Native
      if (typeof global !== 'undefined' && !global.window) {
        const originalHandler = global.Promise;
        if (originalHandler) {
          // Set up promise rejection tracking for React Native
          require('react-native').LogBox?.ignoreLogs(['Unhandled promise rejection']);
        }
      }
    } catch (setupError) {
      // Fallback if error handler setup fails
      console.warn('ErrorHandler: Failed to setup global error handlers', setupError);
    }
  }

  private async loadStoredReports(): Promise<void> {
    try {
      const stored = await storageService.get<ErrorReport[]>('error_reports');
      if (stored) {
        this.errorReports = stored.slice(-this.maxReports);
      }
    } catch (error) {
      logger.error('ErrorHandler: Failed to load stored reports', error, undefined);
    }
  }

  private async storeReports(): Promise<void> {
    try {
      await storageService.set('error_reports', this.errorReports, {
        expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    } catch (error) {
      logger.error('ErrorHandler: Failed to store reports', error, undefined);
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSeverity(error: Error, context: ErrorContext): ErrorSeverity {
    // AbortError from cancelled requests are low severity
    if (error.name === 'AbortError' || error.message.includes('aborted') || error.message.includes('cancelled')) {
      return 'low';
    }

    // Network errors are usually medium severity
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'medium';
    }

    // Authentication errors are high severity
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return 'high';
    }

    // Payment/subscription errors are critical
    if (error.message.includes('payment') || error.message.includes('subscription')) {
      return 'critical';
    }

    // UI/rendering errors are medium severity
    if (context.component || context.screen) {
      return 'medium';
    }

    // Default to medium severity
    return 'medium';
  }

  async handleError(
    error: Error,
    context: ErrorContext = {},
    severity?: ErrorSeverity,
    handled: boolean = true
  ): Promise<void> {
    try {
      const errorReport: ErrorReport = {
        id: this.generateErrorId(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } as Error,
        context: {
          ...context,
          appVersion: CONFIG.APP.VERSION,
          buildNumber: String(CONFIG.APP.BUILD_NUMBER),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        },
        timestamp: Date.now(),
        handled,
      };

      const errorSeverity = severity || this.getSeverity(error, context);

      // Add to reports
      this.errorReports.push(errorReport);
      
      // Keep only recent reports
      if (this.errorReports.length > this.maxReports) {
        this.errorReports = this.errorReports.slice(-this.maxReports);
      }

      // Store reports
      await this.storeReports();

      // Log the error (use appropriate log level based on severity)
      if (errorSeverity === 'low') {
        logger.debug(
          `${errorSeverity.toUpperCase()}: ${error.message}`,
          {
            errorId: errorReport.id,
            severity: errorSeverity,
            context,
          },
          context.userId
        );
      } else {
        logger.error(
          `${errorSeverity.toUpperCase()}: ${error.message}`,
          {
            errorId: errorReport.id,
            severity: errorSeverity,
            context,
            stack: error.stack,
          },
          context.userId
        );
      }

      // Track in analytics (skip low severity errors to reduce noise)
      if (errorSeverity !== 'low') {
        await analyticsService.trackError(error, {
          error_id: errorReport.id,
          severity: errorSeverity,
          handled,
          ...context,
        });
      }

      // Send to crash reporting service in production (skip low severity errors)
      if (CONFIG.FEATURES.ENABLE_CRASH_REPORTING && !handled && errorSeverity !== 'low') {
        await this.sendToCrashReporting(errorReport, errorSeverity);
      }

      // Show user-friendly error message for critical errors
      if (errorSeverity === 'critical' && !handled) {
        this.showCriticalErrorDialog(error);
      }
    } catch (handlingError) {
      // Fallback logging if error handling fails
      console.error('ErrorHandler: Failed to handle error', handlingError);
      console.error('Original error:', error);
    }
  }

  private async sendToCrashReporting(report: ErrorReport, severity: ErrorSeverity): Promise<void> {
    // Implement crash reporting service integration
    // Examples: Sentry, Bugsnag, Crashlytics, etc.
    
    try {
      // Example implementation for Sentry
      // Sentry.captureException(report.error, {
      //   tags: {
      //     severity,
      //     screen: report.context.screen,
      //     component: report.context.component,
      //   },
      //   extra: report.context,
      //   user: {
      //     id: report.userId,
      //   },
      // });
      
      logger.info('ErrorHandler: Error sent to crash reporting', {
        errorId: report.id,
        severity,
      });
    } catch (error) {
      logger.error('ErrorHandler: Failed to send to crash reporting', error, undefined);
    }
  }

  private showCriticalErrorDialog(error: Error): void {
    // In a real app, you might show a modal or alert
    // For now, we'll just log it
    logger.error('CRITICAL ERROR - User should be notified', error, undefined);
    
    // You could dispatch a Redux action or use a global state manager
    // to show an error modal to the user
  }

  // Utility methods for components to use
  async reportError(
    error: Error,
    screen: string,
    component?: string,
    additionalContext?: Record<string, any>
  ): Promise<void> {
    await this.handleError(error, {
      screen,
      component,
      ...additionalContext,
    });
  }

  async reportNetworkError(
    error: Error,
    url: string,
    method: string,
    statusCode?: number
  ): Promise<void> {
    await this.handleError(error, {
      action: 'network_request',
      component: 'network',
      props: {
        url,
        method,
        statusCode,
      },
    }, 'medium');
  }

  async reportAuthError(error: Error, action: string): Promise<void> {
    await this.handleError(error, {
      action: `auth_${action}`,
      component: 'authentication',
    }, 'high');
  }

  async reportPaymentError(error: Error, context: Record<string, any>): Promise<void> {
    await this.handleError(error, {
      action: 'payment_processing',
      component: 'payment',
      ...context,
    }, 'critical');
  }

  // Get error reports for debugging
  getRecentErrors(count: number = 20): ErrorReport[] {
    return this.errorReports.slice(-count);
  }

  getErrorsByScreen(screen: string): ErrorReport[] {
    return this.errorReports.filter(report => report.context.screen === screen);
  }

  getErrorsByComponent(component: string): ErrorReport[] {
    return this.errorReports.filter(report => report.context.component === component);
  }

  getCriticalErrors(): ErrorReport[] {
    return this.errorReports.filter(report => 
      report.error.message.includes('critical') || !report.handled
    );
  }

  // Clear error reports
  async clearReports(): Promise<void> {
    this.errorReports = [];
    await storageService.remove('error_reports');
    logger.info('ErrorHandler: Reports cleared');
  }

  // Get error statistics
  getErrorStats(): {
    total: number;
    handled: number;
    unhandled: number;
    byScreen: Record<string, number>;
    byComponent: Record<string, number>;
  } {
    const stats = {
      total: this.errorReports.length,
      handled: 0,
      unhandled: 0,
      byScreen: {} as Record<string, number>,
      byComponent: {} as Record<string, number>,
    };

    this.errorReports.forEach(report => {
      if (report.handled) {
        stats.handled++;
      } else {
        stats.unhandled++;
      }

      if (report.context.screen) {
        stats.byScreen[report.context.screen] = (stats.byScreen[report.context.screen] || 0) + 1;
      }

      if (report.context.component) {
        stats.byComponent[report.context.component] = (stats.byComponent[report.context.component] || 0) + 1;
      }
    });

    return stats;
  }
}

export const errorHandler = new ErrorHandler();
export default errorHandler;

// Utility function for components
export const withErrorHandling = <T extends (...args: any[]) => any>(
  fn: T,
  context: ErrorContext
): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          errorHandler.handleError(error, context);
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      errorHandler.handleError(error as Error, context);
      throw error;
    }
  }) as T;
};