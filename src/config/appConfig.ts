const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const frontendUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_FRONTEND_URL || "https://flixnext.com.br",
);

export const appConfig = {
  frontendUrl,
  apiUrl: `${frontendUrl}/api/mobile`,
  contentUrl: `${frontendUrl}/api/content`,
  tmdbUrl: `${frontendUrl}/api/tmdb`,
  imageUrl: "https://image.tmdb.org/t/p",
  cache: {
    catalogMoviesKey: "flixnext:catalog:movies:v7",
    catalogSeriesKey: "flixnext:catalog:series:v7",
    catalogTtlMs: 15 * 60 * 1000,
  },
} as const;
