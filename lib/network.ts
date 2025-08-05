import { CONFIG } from './config';
import { logger } from './logger';
import { performanceMonitor } from './performance';

export interface NetworkError extends Error {
  status?: number;
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
  isRetryable?: boolean;
}

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

class NetworkService {
  private baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': `${CONFIG.APP.NAME}/${CONFIG.APP.VERSION} (${CONFIG.APP.BUNDLE_ID})`,
  };

  private createError(message: string, status?: number, code?: string): NetworkError {
    const error = new Error(message) as NetworkError;
    error.status = status;
    error.code = code;
    error.isNetworkError = true;
    error.isRetryable = this.isRetryableError(status, code);
    return error;
  }

  private isRetryableError(status?: number, code?: string): boolean {
    if (!status) return true; // Network errors are retryable
    if (status >= 500) return true; // Server errors are retryable
    if (status === 408 || status === 429) return true; // Timeout and rate limit
    if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') return true;
    return false;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeRequest(
    url: string,
    options: RequestInit,
    config: RequestConfig = {}
  ): Promise<Response> {
    const {
      timeout = CONFIG.API.TIMEOUT,
      retries = CONFIG.API.RETRY_ATTEMPTS,
      retryDelay = CONFIG.API.RETRY_DELAY,
      headers = {},
    } = config;

    const requestHeaders = {
      ...this.baseHeaders,
      ...headers,
    };

    let lastError: NetworkError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        logger.debug(`Network request attempt ${attempt + 1}`, { url, method: options.method });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          headers: requestHeaders,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          const error = this.createError(errorMessage, response.status);
          
          if (!error.isRetryable || attempt === retries) {
            throw error;
          }
          
          lastError = error;
          logger.warn(`Request failed, retrying in ${retryDelay}ms`, { attempt, error: errorMessage });
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
          continue;
        }

        logger.debug('Network request successful', { url, status: response.status });
        return response;
      } catch (error) {
        const networkError = error instanceof Error 
          ? this.createError(error.message, undefined, error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR')
          : this.createError('Unknown network error');

        if (!networkError.isRetryable || attempt === retries) {
          logger.error('Network request failed', networkError);
          throw networkError;
        }

        lastError = networkError;
        logger.warn(`Request failed, retrying in ${retryDelay}ms`, { attempt, error: networkError.message });
        await this.delay(retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError!;
  }

  async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return performanceMonitor.measure(`GET ${url}`, async () => {
      const response = await this.makeRequest(url, { method: 'GET' }, config);
      return response.json();
    });
  }

  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return performanceMonitor.measure(`POST ${url}`, async () => {
      const body = data instanceof FormData ? data : JSON.stringify(data);
      const headers = data instanceof FormData ? {} : { 'Content-Type': 'application/json' };
      
      const response = await this.makeRequest(url, {
        method: 'POST',
        body,
      }, {
        ...config,
        headers: { ...headers, ...config?.headers },
      });
      
      return response.json();
    });
  }

  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return performanceMonitor.measure(`PUT ${url}`, async () => {
      const response = await this.makeRequest(url, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, config);
      
      return response.json();
    });
  }

  async delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return performanceMonitor.measure(`DELETE ${url}`, async () => {
      const response = await this.makeRequest(url, { method: 'DELETE' }, config);
      return response.json();
    });
  }

  async uploadFile(url: string, file: File | FormData, config?: RequestConfig): Promise<any> {
    return performanceMonitor.measure(`UPLOAD ${url}`, async () => {
      const formData = file instanceof FormData ? file : (() => {
        const fd = new FormData();
        fd.append('file', file);
        return fd;
      })();

      const response = await this.makeRequest(url, {
        method: 'POST',
        body: formData,
      }, {
        ...config,
        headers: { ...config?.headers }, // Don't set Content-Type for FormData
      });
      
      return response.json();
    });
  }

  // Health check endpoint
  async healthCheck(): Promise<boolean> {
    try {
      await this.get(`${CONFIG.AI.RORK_AI_BASE_URL}/health`, { timeout: 5000, retries: 1 });
      return true;
    } catch {
      return false;
    }
  }
}

export const networkService = new NetworkService();
export default networkService;