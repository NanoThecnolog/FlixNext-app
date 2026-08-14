import { backendClient } from "../api/httpClients";
import {
  WatchedProgress,
  WatchHistoryEntry,
  WatchHistoryResponse,
} from "../domain/user";

class ProgressService {
  private listeners = new Set<() => void>();

  async byContent(tmdbID: number) {
    const { data } = await backendClient.get<WatchedProgress[]>(
      "/content/watched",
      { params: { tmdbID } },
    );
    return data;
  }

  async list() {
    const { data } = await backendClient.get<
      WatchHistoryResponse | WatchHistoryEntry[]
    >("/user/watched");
    return Array.isArray(data) ? data : (data.result ?? []);
  }

  async save(progress: WatchedProgress) {
    const { data } = await backendClient.post<WatchedProgress>(
      "/content/watched",
      progress,
    );
    this.listeners.forEach((listener) => listener());
    return data;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const progressService = new ProgressService();
