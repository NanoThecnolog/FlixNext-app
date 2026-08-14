import { tmdbClient } from "../api/httpClients";

interface TmdbVideo {
  key: string;
  name?: string;
  site?: string;
  type?: string;
  published_at?: string;
}

interface TmdbVideoResponse {
  id: number;
  results: TmdbVideo[];
}

const publishedAt = (video: TmdbVideo) => {
  const timestamp = Date.parse(video.published_at ?? "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

class TrailerService {
  async youtubeUrl(type: "movie" | "tv", tmdbId: number) {
    const { data } = await tmdbClient.get<TmdbVideoResponse>(
      `/trailer/${type}/${tmdbId}`,
    );
    const trailer = (data.results ?? [])
      .filter(
        (video) =>
          video.type?.toLocaleLowerCase("pt-BR") === "trailer" &&
          video.site?.toLocaleLowerCase("pt-BR") === "youtube" &&
          Boolean(video.key?.trim()),
      )
      .sort((first, second) => publishedAt(second) - publishedAt(first))[0];

    return trailer
      ? `https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`
      : null;
  }
}

export const trailerService = new TrailerService();
