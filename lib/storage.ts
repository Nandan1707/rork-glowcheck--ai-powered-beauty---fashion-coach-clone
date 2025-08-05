import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from './config';
import { logger } from './logger';

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

export interface StorageOptions {
  expiresIn?: number; // milliseconds
  version?: string;
  compress?: boolean;
}

class StorageService {
  private readonly keyPrefix = `${CONFIG.APP.NAME}_`;
  private readonly currentVersion = CONFIG.APP.VERSION;

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.expiresAt;
  }

  private isVersionMismatch(item: CacheItem): boolean {
    return item.version !== this.currentVersion;
  }

  async set<T>(key: string, data: T, options: StorageOptions = {}): Promise<void> {
    try {
      const {
        expiresIn = CONFIG.STORAGE.CACHE_EXPIRY,
        version = this.currentVersion,
      } = options;

      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + expiresIn,
        version,
      };

      const serialized = JSON.stringify(cacheItem);
      await AsyncStorage.setItem(this.getKey(key), serialized);
      
      logger.debug('Storage: Item saved', { key, size: serialized.length });
    } catch (error) {
      logger.error('Storage: Failed to save item', error, undefined);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const serialized = await AsyncStorage.getItem(this.getKey(key));
      
      if (!serialized) {
        return null;
      }

      const cacheItem: CacheItem<T> = JSON.parse(serialized);

      // Check if expired or version mismatch
      if (this.isExpired(cacheItem) || this.isVersionMismatch(cacheItem)) {
        logger.debug('Storage: Item expired or version mismatch, removing', { key });
        await this.remove(key);
        return null;
      }

      logger.debug('Storage: Item retrieved', { key });
      return cacheItem.data;
    } catch (error) {
      logger.error('Storage: Failed to retrieve item', error, undefined);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getKey(key));
      logger.debug('Storage: Item removed', { key });
    } catch (error) {
      logger.error('Storage: Failed to remove item', error, undefined);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => key.startsWith(this.keyPrefix));
      await AsyncStorage.multiRemove(appKeys);
      logger.info('Storage: All app data cleared', { count: appKeys.length });
    } catch (error) {
      logger.error('Storage: Failed to clear storage', error, undefined);
    }
  }

  async getSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => key.startsWith(this.keyPrefix));
      
      let totalSize = 0;
      for (const key of appKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return totalSize;
    } catch (error) {
      logger.error('Storage: Failed to calculate size', error, undefined);
      return 0;
    }
  }

  async cleanup(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => key.startsWith(this.keyPrefix));
      
      let removedCount = 0;
      
      for (const key of appKeys) {
        try {
          const serialized = await AsyncStorage.getItem(key);
          if (serialized) {
            const cacheItem: CacheItem = JSON.parse(serialized);
            
            if (this.isExpired(cacheItem) || this.isVersionMismatch(cacheItem)) {
              await AsyncStorage.removeItem(key);
              removedCount++;
            }
          }
        } catch {
          // If we can't parse the item, remove it
          await AsyncStorage.removeItem(key);
          removedCount++;
        }
      }
      
      logger.info('Storage: Cleanup completed', { removedCount });
    } catch (error) {
      logger.error('Storage: Cleanup failed', error, undefined);
    }
  }

  // User-specific storage methods
  async setUserData<T>(userId: string, key: string, data: T, options?: StorageOptions): Promise<void> {
    return this.set(`user_${userId}_${key}`, data, options);
  }

  async getUserData<T>(userId: string, key: string): Promise<T | null> {
    return this.get<T>(`user_${userId}_${key}`);
  }

  async removeUserData(userId: string, key: string): Promise<void> {
    return this.remove(`user_${userId}_${key}`);
  }

  async clearUserData(userId: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter(key => key.startsWith(`${this.keyPrefix}user_${userId}_`));
      await AsyncStorage.multiRemove(userKeys);
      logger.info('Storage: User data cleared', { userId, count: userKeys.length });
    } catch (error) {
      logger.error('Storage: Failed to clear user data', error, undefined);
    }
  }

  // Image cache methods
  async cacheImage(url: string, base64Data: string): Promise<void> {
    const key = `image_${this.hashString(url)}`;
    await this.set(key, base64Data, { expiresIn: 24 * 60 * 60 * 1000 }); // 24 hours
  }

  async getCachedImage(url: string): Promise<string | null> {
    const key = `image_${this.hashString(url)}`;
    return this.get<string>(key);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Analytics data storage
  async storeAnalyticsEvent(event: any): Promise<void> {
    try {
      const events = await this.get<any[]>('analytics_events') || [];
      events.push({
        ...event,
        timestamp: Date.now(),
      });
      
      // Keep only last 1000 events
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }
      
      await this.set('analytics_events', events, { expiresIn: 30 * 24 * 60 * 60 * 1000 }); // 30 days
    } catch (error) {
      logger.error('Storage: Failed to store analytics event', error, undefined);
    }
  }

  async getAnalyticsEvents(): Promise<any[]> {
    return this.get<any[]>('analytics_events') || [];
  }

  async clearAnalyticsEvents(): Promise<void> {
    await this.remove('analytics_events');
  }
}

export const storageService = new StorageService();
export default storageService;