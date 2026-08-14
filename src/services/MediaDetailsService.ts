import { tmdbClient } from "../api/httpClients";
import {
  CatalogItem,
  TmdbCredits,
  TmdbMovie,
  TmdbSeasonDetails,
  TmdbSeries,
} from "../domain/content";

export interface MediaDetails {
  metadata: TmdbMovie | TmdbSeries | null;
  credits: TmdbCredits | null;
}

interface SeasonLoadOptions {
  expectedEpisodeCount?: number;
}

const detailsLogEnabled =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_CATALOG !== "false";

const logSeason = (message: string) => {
  if (detailsLogEnabled) console.log(`[FlixNext:Details] ${message}`);
};

interface MemoryEntry<T> {
  expiresAt: number;
  value: T;
}

const MEMORY_TTL_MS = 10 * 60 * 1000;
const MAX_DETAILS_ENTRIES = 12;
const MAX_SEASON_ENTRIES = 8;

const isSeasonDetails = (
  value: unknown,
  season: number,
): value is TmdbSeasonDetails => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TmdbSeasonDetails>;
  if (candidate.season_number !== season || !Array.isArray(candidate.episodes)) {
    return false;
  }
  return candidate.episodes.every(
    (episode) =>
      episode &&
      typeof episode === "object" &&
      typeof episode.episode_number === "number",
  );
};

class MediaDetailsService {
  private detailsCache = new Map<string, MemoryEntry<MediaDetails>>();
  private seasonCache = new Map<string, MemoryEntry<TmdbSeasonDetails>>();
  private pendingDetails = new Map<string, Promise<MediaDetails>>();
  private pendingSeasons = new Map<string, Promise<TmdbSeasonDetails>>();

  private readMemory<T>(cache: Map<string, MemoryEntry<T>>, key: string) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      cache.delete(key);
      return null;
    }
    cache.delete(key);
    cache.set(key, entry);
    return entry.value;
  }

  private writeMemory<T>(
    cache: Map<string, MemoryEntry<T>>,
    key: string,
    value: T,
    limit: number,
  ) {
    cache.delete(key);
    cache.set(key, { expiresAt: Date.now() + MEMORY_TTL_MS, value });
    while (cache.size > limit) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
  }

  load(item: CatalogItem): Promise<MediaDetails> {
    const key = `${item.kind}:${item.id}`;
    const cached = this.readMemory(this.detailsCache, key);
    if (cached) {
      logSeason(`Cache de sessão ✓ detalhes=${key}`);
      return Promise.resolve(cached);
    }
    const pending = this.pendingDetails.get(key);
    if (pending) return pending;

    const request = this.fetchDetails(item);
    this.pendingDetails.set(key, request);
    const clearPending = () => {
      if (this.pendingDetails.get(key) === request) {
        this.pendingDetails.delete(key);
      }
    };
    void request.then(clearPending, clearPending);
    return request;
  }

  private async fetchDetails(item: CatalogItem): Promise<MediaDetails> {
    const type = item.kind === "movie" ? "movie" : "tv";
    const startedAt = Date.now();
    const [metadataResult, creditsResult] = await Promise.allSettled([
      item.kind === "movie"
        ? tmdbClient.get<TmdbMovie>(`/movie/${item.id}`)
        : Promise.resolve({ data: item.tmdb }),
      tmdbClient.get<TmdbCredits>(`/${type}/${item.id}/credits`),
    ]);

    if (
      metadataResult.status === "rejected" &&
      creditsResult.status === "rejected"
    ) {
      throw metadataResult.reason;
    }

    const metadata =
      metadataResult.status === "fulfilled"
        ? metadataResult.value.data
        : item.tmdb;
    const credits =
      creditsResult.status === "fulfilled" ? creditsResult.value.data : null;
    logSeason(
      `Detalhes TMDB ✓ ${Date.now() - startedAt}ms | tipo=${type} | id=${item.id} | metadados=${metadataResult.status === "fulfilled" ? "completos" : "catálogo"} | elenco=${credits?.cast.length ?? 0} | crew=${credits?.crew.length ?? 0}`,
    );
    const details = { metadata, credits };
    this.writeMemory(
      this.detailsCache,
      `${item.kind}:${item.id}`,
      details,
      MAX_DETAILS_ENTRIES,
    );
    return details;
  }

  loadSeason(
    tmdbId: number,
    season: number,
    options: SeasonLoadOptions = {},
  ): Promise<TmdbSeasonDetails> {
    const key = `${tmdbId}:${season}`;
    const cached = this.readMemory(this.seasonCache, key);
    if (cached) {
      logSeason(`Cache de sessão ✓ temporada=${key}`);
      return Promise.resolve(cached);
    }
    const pending = this.pendingSeasons.get(key);
    if (pending) return pending;

    const request = this.fetchSeason(tmdbId, season, options);
    this.pendingSeasons.set(key, request);
    const clearPending = () => {
      if (this.pendingSeasons.get(key) === request) {
        this.pendingSeasons.delete(key);
      }
    };
    void request.then(clearPending, clearPending);
    return request;
  }

  private async fetchSeason(
    tmdbId: number,
    season: number,
    options: SeasonLoadOptions,
  ) {
    const startedAt = Date.now();
    const { data } = await tmdbClient.get<TmdbSeasonDetails>(
      `/tv/${tmdbId}/season/${season}`,
    );
    if (!isSeasonDetails(data, season)) {
      throw new Error("Resposta de temporada inválida.");
    }
    const expected = options.expectedEpisodeCount;
    const incomplete = expected !== undefined && data.episodes.length < expected;
    logSeason(
      `Temporada TMDB ✓ ${Date.now() - startedAt}ms | série=${tmdbId} | temporada=${season} | episódios=${data.episodes.length}${incomplete ? ` | esperados=${expected}` : ""}`,
    );
    this.writeMemory(
      this.seasonCache,
      `${tmdbId}:${season}`,
      data,
      MAX_SEASON_ENTRIES,
    );
    return data;
  }
}

export const mediaDetailsService = new MediaDetailsService();
