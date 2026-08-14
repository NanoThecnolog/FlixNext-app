import { appConfig } from "../config/appConfig";
import { CatalogItem } from "../domain/content";

export const titleFor = (item: CatalogItem) =>
  item.kind === "movie"
    ? item.tmdb?.title || item.mongo.title
    : item.tmdb?.name || item.mongo.title;

export const descriptionFor = (item: CatalogItem) =>
  item.tmdb?.overview || item.mongo.description;

export const genresFor = (item: CatalogItem) => {
  const tmdbGenres = item.tmdb?.genres.map((genre) => genre.name) ?? [];
  return tmdbGenres.length ? tmdbGenres : item.mongo.genero;
};

export const imageFor = (
  item: CatalogItem,
  variant: "poster" | "backdrop" = "poster",
) => {
  const path =
    variant === "backdrop" ? item.tmdb?.backdrop_path : item.tmdb?.poster_path;
  if (path) {
    const size = variant === "backdrop" ? "w780" : "w342";
    return `${appConfig.imageUrl}/${size}${path}`;
  }
  return variant === "backdrop" ? item.mongo.background : item.mongo.overlay;
};

export const mediaKey = (item: CatalogItem) => `${item.kind}:${item.id}`;

export const normalizeGenre = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}
