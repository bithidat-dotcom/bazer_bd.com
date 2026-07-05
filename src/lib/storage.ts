import { get, set, del, clear } from 'idb-keyval';

/**
 * Storage utility that transparently handles both small (LocalStorage)
 * and large (IndexedDB) data storage to avoid browser quota limits.
 * 
 * LocalStorage: ~5MB limit (synchronous)
 * IndexedDB: 250MB+ limit (asynchronous)
 */
class StorageService {
  /**
   * For large datasets like products, sellers, etc.
   */
  async setLarge(key: string, value: any): Promise<void> {
    try {
      await set(key, value);
    } catch (err) {
      console.error(`Failed to save large data to IndexedDB for key: ${key}`, err);
    }
  }

  async getLarge<T>(key: string): Promise<T | null> {
    try {
      const data = await get(key);
      return data as T;
    } catch (err) {
      console.error(`Failed to read large data from IndexedDB for key: ${key}`, err);
      return null;
    }
  }

  async removeLarge(key: string): Promise<void> {
    await del(key);
  }

  async clearLarge(): Promise<void> {
    await clear();
  }

  /**
   * For small configuration like user preferences, small IDs, etc.
   */
  setSmall(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`LocalStorage full, trying to move ${key} to IndexedDB fallback`);
      this.setLarge(key, value);
    }
  }

  getSmall<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  removeSmall(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Hybrid helper: Tries LocalStorage first, then IndexedDB
   */
  async getAny<T>(key: string): Promise<T | null> {
    const small = this.getSmall<T>(key);
    if (small) return small;
    return await this.getLarge<T>(key);
  }
}

export const Storage = new StorageService();
export type { StorageService };
