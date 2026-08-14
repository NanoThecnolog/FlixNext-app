import { contentClient } from "../api/httpClients";

export interface LatestEpisode {
  tmdbID: number;
  seasonNumber: number;
  episodeNumber: number;
  language: string;
  addedAt: string;
}

const CACHE_TTL_MS = 60_000;

class LatestEpisodesService {
  private cache = new Map<
    number,
    { createdAt: number; promise: Promise<LatestEpisode[]> }
  >();

  list(limit = 24) {
    const cached = this.cache.get(limit);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      return cached.promise;
    }

    const request = contentClient
      .get<LatestEpisode[]>("/serie/latest-episodes", { params: { limit } })
      .then(({ data }) => data)
      .catch((error) => {
        this.cache.delete(limit);
        throw error;
      });

    this.cache.set(limit, { createdAt: Date.now(), promise: request });
    return request;
  }
}

export const latestEpisodesService = new LatestEpisodesService();
