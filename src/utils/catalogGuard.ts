import { Catalog, CatalogItem } from "../domain/content";

export const emptyCatalog = (): Catalog => ({
  movies: [],
  series: [],
  all: [],
});

const isCatalogItem = (value: unknown): value is CatalogItem => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CatalogItem>;
  return (
    (item.kind === "movie" || item.kind === "series") &&
    typeof item.id === "number" &&
    Boolean(item.mongo)
  );
};

export function normalizeCatalog(value: unknown): Catalog | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Catalog>;
  if (!Array.isArray(candidate.movies) || !Array.isArray(candidate.series)) {
    return null;
  }
  if (
    !candidate.movies.every(isCatalogItem) ||
    !candidate.series.every(isCatalogItem)
  ) {
    return null;
  }

  return {
    movies: candidate.movies,
    series: candidate.series,
    all: Array.isArray(candidate.all)
      ? candidate.all.filter(isCatalogItem)
      : [...candidate.movies, ...candidate.series],
  };
}
