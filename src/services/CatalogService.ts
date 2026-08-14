import { contentClient } from "../api/httpClients";
import { appConfig } from "../config/appConfig";
import {
  Catalog,
  MongoMovie,
  MongoSeries,
  TmdbBatchResponse,
  TmdbMovie,
  TmdbSeries,
} from "../domain/content";
import { createCatalog } from "../mappers/catalogMapper";
import { CacheEnvelope, cacheStorage } from "../storage/cacheStorage";
import { normalizeCatalog } from "../utils/catalogGuard";
import { catalogLogger } from "../utils/catalogLogger";

export interface CachedCatalog {
  catalog: Catalog;
  stale: boolean;
}

class CatalogService {
  private memory: Catalog | null = null;
  private pending: Promise<Catalog> | null = null;

  async cached(): Promise<CachedCatalog | null> {
    const memory = normalizeCatalog(this.memory);
    if (memory?.all.length) {
      catalogLogger.cache("memory", `itens=${memory.all.length}`);
      return { catalog: memory, stale: false };
    }

    let movieEntry: CacheEnvelope<Catalog["movies"]> | null;
    let seriesEntry: CacheEnvelope<Catalog["series"]> | null;
    try {
      [movieEntry, seriesEntry] = await Promise.all([
        cacheStorage.read<Catalog["movies"]>(appConfig.cache.catalogMoviesKey),
        cacheStorage.read<Catalog["series"]>(appConfig.cache.catalogSeriesKey),
      ]);
    } catch (error) {
      catalogLogger.cacheFailed("leitura", error);
      return null;
    }

    if (!movieEntry || !seriesEntry) {
      catalogLogger.cache("miss");
      return null;
    }

    const catalog = normalizeCatalog({
      movies: movieEntry.value,
      series: seriesEntry.value,
      all: [...movieEntry.value, ...seriesEntry.value],
    });
    if (!catalog?.all.length) {
      catalogLogger.cache("invalid", "catálogo vazio removido");
      await this.clearPersistentCache();
      return null;
    }

    this.memory = catalog;
    const savedAt = Math.min(movieEntry.savedAt, seriesEntry.savedAt);
    const ageMs = Date.now() - savedAt;
    const stale = ageMs >= appConfig.cache.catalogTtlMs;
    catalogLogger.cache(
      "storage",
      `itens=${catalog.all.length} | idade=${ageMs}ms | expirado=${stale}`,
    );
    return { catalog, stale };
  }

  refresh(): Promise<Catalog> {
    if (this.pending) return this.pending;

    const request = this.fetchRemote();
    this.pending = request;
    void request.finally(() => {
      if (this.pending === request) this.pending = null;
    });
    return request;
  }

  private async fetchRemote(): Promise<Catalog> {
    const [mongoMovies, mongoSeries, movieResponse, seriesResponse] =
      await Promise.all([
        this.fetchMongoMovies(),
        this.fetchMongoSeries(),
        this.fetchTmdbMovies(),
        this.fetchTmdbSeries(),
      ]);

    const catalog = createCatalog(
      mongoMovies,
      mongoSeries,
      movieResponse.data,
      seriesResponse.data,
    );

    if (!catalog.all.length) {
      throw new Error(
        "As fontes responderam, mas o catálogo combinado ficou vazio.",
      );
    }

    const moviesWithoutTmdb = catalog.movies.filter(
      (item) => !item.tmdb,
    ).length;
    const seriesWithoutTmdb = catalog.series.filter(
      (item) => !item.tmdb,
    ).length;
    catalogLogger.mapped(
      `total=${catalog.all.length} | filmes=${catalog.movies.length} | séries=${catalog.series.length} | filmes sem TMDB=${moviesWithoutTmdb} | séries sem TMDB=${seriesWithoutTmdb} | status TMDB filmes=${movieResponse.status} | status TMDB séries=${seriesResponse.status}`,
    );

    this.memory = catalog;
    try {
      await Promise.all([
        cacheStorage.write(appConfig.cache.catalogMoviesKey, catalog.movies),
        cacheStorage.write(appConfig.cache.catalogSeriesKey, catalog.series),
      ]);
    } catch (error) {
      catalogLogger.cacheFailed("gravação", error);
      await this.clearPersistentCache();
    }
    return catalog;
  }

  private async clearPersistentCache() {
    try {
      await Promise.all([
        cacheStorage.remove(appConfig.cache.catalogMoviesKey),
        cacheStorage.remove(appConfig.cache.catalogSeriesKey),
      ]);
    } catch (error) {
      catalogLogger.cacheFailed("gravação", error);
    }
  }

  private fetchMongoMovies() {
    return this.fetchWithLog(
      "MongoDB · filmes",
      "/movie",
      async () => (await contentClient.get<MongoMovie[]>("/movie")).data,
      (movies) =>
        `registros=${movies.length} | reproduzíveis=${
          movies.filter((movie) => Boolean(movie.src)).length
        }`,
    );
  }

  private fetchMongoSeries() {
    return this.fetchWithLog(
      "MongoDB · séries",
      "/serie",
      async () => (await contentClient.get<MongoSeries[]>("/serie")).data,
      (series) =>
        `registros=${series.length} | temporadas=${series.reduce(
          (total, item) => total + item.season.length,
          0,
        )} | episódios=${series.reduce(
          (total, item) =>
            total +
            item.season.reduce(
              (seasonTotal, season) => seasonTotal + season.episodes.length,
              0,
            ),
          0,
        )}`,
    );
  }

  private fetchTmdbMovies() {
    return this.fetchWithLog(
      "TMDB · filmes",
      "/movie/tmdb",
      async () =>
        (await contentClient.get<TmdbBatchResponse<TmdbMovie>>("/movie/tmdb"))
          .data,
      (response) =>
        `registros=${response.data.length} | status=${response.status} | erros=${response.errors.length}`,
    );
  }

  private fetchTmdbSeries() {
    return this.fetchWithLog(
      "TMDB · séries",
      "/serie/tmdb",
      async () =>
        (await contentClient.get<TmdbBatchResponse<TmdbSeries>>("/serie/tmdb"))
          .data,
      (response) =>
        `registros=${response.data.length} | status=${response.status} | erros=${response.errors.length}`,
    );
  }

  private async fetchWithLog<T>(
    label: string,
    path: string,
    request: () => Promise<T>,
    summarize: (payload: T) => string,
  ): Promise<T> {
    const startedAt = Date.now();
    catalogLogger.request(label, path);
    try {
      const payload = await request();
      catalogLogger.loaded(
        label,
        path,
        Date.now() - startedAt,
        summarize(payload),
      );
      return payload;
    } catch (error) {
      catalogLogger.failed(label, path, Date.now() - startedAt, error);
      throw error;
    }
  }
}

export const catalogService = new CatalogService();
