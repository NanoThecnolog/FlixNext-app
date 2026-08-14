import { backendClient } from "../api/httpClients";
import { CatalogItem } from "../domain/content";
import { WatchLaterEntry } from "../domain/user";

class LibraryService {
  async list() {
    const { data } = await backendClient.get<WatchLaterEntry[]>("/watchLater");
    return data;
  }

  async add(item: CatalogItem) {
    const { data } = await backendClient.post<WatchLaterEntry>("/watchLater", {
      tmdbid: item.id,
      title: item.mongo.title,
      subtitle: item.mongo.subtitle,
    });
    return data;
  }

  async remove(id: number) {
    await backendClient.delete(`/watchLater/${id}`);
  }
}

export const libraryService = new LibraryService();
