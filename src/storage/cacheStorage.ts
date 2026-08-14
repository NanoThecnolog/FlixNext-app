import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CacheEnvelope<T> {
  savedAt: number;
  value: T;
}

class CacheStorage {
  async read<T>(key: string): Promise<CacheEnvelope<T> | null> {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as CacheEnvelope<T>;
    } catch {
      await AsyncStorage.removeItem(key);
      return null;
    }
  }

  async write<T>(key: string, value: T) {
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), value };
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  }

  remove(key: string) {
    return AsyncStorage.removeItem(key);
  }

}

export const cacheStorage = new CacheStorage();
