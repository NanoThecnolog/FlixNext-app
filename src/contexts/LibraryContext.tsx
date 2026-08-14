import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CatalogItem } from "../domain/content";
import { WatchLaterEntry } from "../domain/user";
import { libraryService } from "../services/LibraryService";
import { useAuth } from "./AuthContext";

interface LibraryContextValue {
  entries: WatchLaterEntry[];
  loading: boolean;
  initialized: boolean;
  contains: (tmdbId: number) => boolean;
  toggle: (item: CatalogItem) => Promise<void>;
  refresh: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WatchLaterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializedUserId, setInitializedUserId] = useState<string | null>(
    null,
  );
  const initialized = !user || initializedUserId === String(user.id);

  const refresh = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setInitializedUserId(null);
      return;
    }
    setLoading(true);
    setInitializedUserId(null);
    try {
      setEntries(await libraryService.list());
    } finally {
      setLoading(false);
      setInitializedUserId(String(user.id));
    }
  }, [user]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const contains = useCallback(
    (tmdbId: number) => entries.some((entry) => entry.tmdbid === tmdbId),
    [entries],
  );

  const toggle = useCallback(
    async (item: CatalogItem) => {
      const existing = entries.find((entry) => entry.tmdbid === item.id);
      if (existing) await libraryService.remove(existing.id);
      else await libraryService.add(item);
      await refresh();
    },
    [entries, refresh],
  );

  const value = useMemo(
    () => ({ entries, loading, initialized, contains, toggle, refresh }),
    [contains, entries, initialized, loading, refresh, toggle],
  );
  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibrary deve ser usado dentro de LibraryProvider");
  }
  return context;
}
