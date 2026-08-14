import { Catalog, CatalogItem } from "../domain/content";

const featuredContent = [
  { id: 1081003, kind: "movie" },
  { id: 287620, kind: "series" },
  { id: 454639, kind: "movie" },
  { id: 287238, kind: "series" },
  { id: 1314481, kind: "movie" },
  { id: 125988, kind: "series" },
  { id: 278624, kind: "series" },
  { id: 1275779, kind: "movie" },
  { id: 94997, kind: "series" },
  { id: 1339713, kind: "movie" },
  { id: 113962, kind: "series" },
  { id: 1083381, kind: "movie" },
] as const;

export function selectFeaturedContent(catalog: Catalog): CatalogItem[] {
  const itemsByKey = new Map(
    catalog.all.map((item) => [`${item.kind}:${item.id}`, item]),
  );
  const selected = featuredContent.flatMap((featured) => {
    const item = itemsByKey.get(`${featured.kind}:${featured.id}`);
    return item ? [item] : [];
  });
  return selected.length ? selected : catalog.all.slice(0, 5);
}

export const trailerUrlFor = (tmdbId: number) =>
  `https://f005.backblazeb2.com/file/Flixnext/videos/trailers/${tmdbId}/master.m3u8`;
