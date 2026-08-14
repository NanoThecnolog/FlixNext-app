export type ContentKind = "movie" | "series";

export interface MongoMovie {
  background: string;
  overlay: string;
  tmdbId: number;
  title: string;
  subtitle: string;
  description: string;
  faixa: string;
  src: string;
  duration: string;
  genero: string[];
  index: number;
  news?: string;
  lang?: "Dub" | "Leg";
}

export interface MongoEpisode {
  ep: number;
  src: string;
  duration: string;
  createdAt?: string;
}

export interface MongoSeason {
  s: number;
  lang: string;
  episodes: MongoEpisode[];
}

export interface MongoSeries {
  background: string;
  overlay: string;
  tmdbID: number;
  title: string;
  subtitle?: string;
  description: string;
  genero: string[];
  faixa: string;
  season: MongoSeason[];
  index: number;
  news?: string;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCollection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

interface TmdbTitleBase {
  id: number;
  backdrop_path: string | null;
  poster_path: string | null;
  overview: string;
  genres: TmdbGenre[];
  popularity: number;
  vote_average: number;
  vote_count?: number;
}

export interface TmdbMovie extends TmdbTitleBase {
  title: string;
  original_title?: string;
  release_date?: string;
  runtime?: number;
  budget?: number;
  revenue?: number;
  belongs_to_collection?: TmdbCollection | null;
}

export interface TmdbSeasonSummary {
  air_date: string | null;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
}

export interface TmdbSeries extends TmdbTitleBase {
  name: string;
  first_air_date?: string;
  status?: string;
  seasons: TmdbSeasonSummary[];
}

export interface TmdbPerson {
  id: number;
  name: string;
  profile_path: string | null;
  character?: string;
  job?: string;
  department?: string;
  known_for_department?: string;
}

export interface TmdbCredits {
  id: number;
  cast: TmdbPerson[];
  crew: TmdbPerson[];
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
  air_date?: string;
  episode_type?: string;
}

export interface TmdbSeasonDetails {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  poster_path: string | null;
  episodes: TmdbEpisode[];
}

export interface CatalogMovie {
  kind: "movie";
  id: number;
  mongo: MongoMovie;
  tmdb: TmdbMovie | null;
}

export interface CatalogSeries {
  kind: "series";
  id: number;
  mongo: MongoSeries;
  tmdb: TmdbSeries | null;
}

export type CatalogItem = CatalogMovie | CatalogSeries;

export interface Catalog {
  movies: CatalogMovie[];
  series: CatalogSeries[];
  all: CatalogItem[];
}

export interface TmdbBatchResponse<T> {
  success: boolean;
  status: "complete" | "partial";
  data: T[];
  errors: Array<{
    id: number;
    code: string;
    message: string;
    status: number | null;
    retryable: boolean;
  }>;
}

export interface PlaybackSource {
  kind: ContentKind;
  tmdbId: number;
  title: string;
  subtitle?: string;
  uri: string;
  duration?: string;
  startPosition?: number;
  season?: number;
  episode?: number;
}
