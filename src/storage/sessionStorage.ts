import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "flix-token";
const DEVICE_KEY = "flix-device";

class SessionStorage {
  private listeners = new Set<() => void>();

  getToken() {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  getDeviceToken() {
    return SecureStore.getItemAsync(DEVICE_KEY);
  }

  async save(token: string, deviceToken?: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (deviceToken) await SecureStore.setItemAsync(DEVICE_KEY, deviceToken);
  }

  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(DEVICE_KEY),
    ]);
    this.listeners.forEach((listener) => listener());
  }

  onCleared(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const sessionStorage = new SessionStorage();
