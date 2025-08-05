import { CONFIG } from './config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  userId?: string;
}

class Logger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  constructor() {
    this.logLevel = CONFIG.APP.IS_DEV ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const dataStr = data ? ' | Data: ' + JSON.stringify(data) : '';
    return '[' + timestamp + '] ' + levelName + ': ' + message + dataStr;
  }

  private addLog(level: LogLevel, message: string, data?: any, userId?: string) {
    const logEntry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      userId,
    };

    this.logs.push(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In production, you might want to send logs to a service
    if (CONFIG.APP.IS_PRODUCTION && level >= LogLevel.ERROR) {
      this.sendToLoggingService(logEntry);
    }
  }

  private async sendToLoggingService(logEntry: LogEntry) {
    // Implement your logging service integration here
    // For example: Sentry, LogRocket, or custom service
    try {
      // await loggingService.send(logEntry);
      console.log('Would send to logging service:', logEntry);
    } catch (error) {
      console.error('Failed to send log to service:', error);
    }
  }

  debug(message: string, data?: any, userId?: string) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, data));
      this.addLog(LogLevel.DEBUG, message, data, userId);
    }
  }

  info(message: string, data?: any, userId?: string) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, data));
      this.addLog(LogLevel.INFO, message, data, userId);
    }
  }

  warn(message: string, data?: any, userId?: string) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, data));
      this.addLog(LogLevel.WARN, message, data, userId);
    }
  }

  error(message: string, error?: any, userId?: string) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorData = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error;
      
      console.error(this.formatMessage(LogLevel.ERROR, message, errorData));
      this.addLog(LogLevel.ERROR, message, errorData, userId);
    }
  }

  // Performance logging
  time(label: string) {
    if (CONFIG.APP.IS_DEV) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (CONFIG.APP.IS_DEV) {
      console.timeEnd(label);
    }
  }

  // Get recent logs for debugging
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();
export default logger;