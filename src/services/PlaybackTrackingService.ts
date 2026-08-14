import { backendClient } from "../api/httpClients";
import { PlaybackSource } from "../domain/content";
import { sessionStorage } from "../storage/sessionStorage";

const trackingLogEnabled =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_CATALOG !== "false";

const pathFor = (source: PlaybackSource) => {
  if (source.kind === "movie") return `/watch/${source.tmdbId}`;
  if (source.season === undefined || source.episode === undefined) return null;

  const params = new URLSearchParams({
    episode: String(source.episode),
    tmdbID: String(source.tmdbId),
    src: source.uri,
    season: String(source.season),
  });
  return `/watch/serie?${params.toString()}`;
};

class PlaybackTrackingService {
  private lastPath: string | null = null;

  async track(source: PlaybackSource) {
    const path = pathFor(source);
    if (!path) return;
    if (this.lastPath === path) return;

    this.lastPath = path;
    if (!(await sessionStorage.getToken())) return;

    try {
      await backendClient.post("/track", { path });
      if (trackingLogEnabled) {
        console.log(
          `[FlixNext:Tracking] Reprodução registrada | tipo=${source.kind} | id=${source.tmdbId}${source.kind === "series" ? ` | temporada=${source.season} | episódio=${source.episode}` : ""}`,
        );
      }
    } catch (error) {
      if (trackingLogEnabled) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[FlixNext:Tracking] Falha ao registrar reprodução | tipo=${source.kind} | id=${source.tmdbId} | ${message}`,
        );
      }
    }
  }
}

export const playbackTrackingService = new PlaybackTrackingService();
