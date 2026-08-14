import {
  Catalog,
  CatalogMovie,
  CatalogSeries,
  MongoMovie,
  MongoSeries,
  TmdbMovie,
  TmdbSeries,
} from "../domain/content";

export function createCatalog(
  mongoMovies: MongoMovie[],
  mongoSeries: MongoSeries[],
  tmdbMovies: TmdbMovie[],
  tmdbSeries: TmdbSeries[],
): Catalog {
  const moviesById = new Map(tmdbMovies.map((item) => [item.id, item]));
  const seriesById = new Map(tmdbSeries.map((item) => [item.id, item]));

  const movies: CatalogMovie[] = mongoMovies.map((mongo) => ({
    kind: "movie",
    id: mongo.tmdbId,
    mongo,
    tmdb: moviesById.get(mongo.tmdbId) ?? null,
  }));

  const series: CatalogSeries[] = mongoSeries.map((mongo) => ({
    kind: "series",
    id: mongo.tmdbID,
    mongo,
    tmdb: seriesById.get(mongo.tmdbID) ?? null,
  }));

  return {
    movies,
    series,
    all: [...movies, ...series],
  };
}
