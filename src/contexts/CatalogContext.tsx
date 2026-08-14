import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Catalog } from "../domain/content";
import { catalogService } from "../services/CatalogService";
import { emptyCatalog, normalizeCatalog } from "../utils/catalogGuard";
import { catalogLogger } from "../utils/catalogLogger";
import {
  createRelatedContentIndex,
  RelatedContentIndex,
} from "../utils/relatedContent";

interface CatalogContextValue {
  catalog: Catalog;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  relatedIndex: RelatedContentIndex;
  refresh: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: PropsWithChildren) {
  const [catalog, setCatalog] = useState<Catalog>(() => emptyCatalog());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const remoteCatalog = await catalogService.refresh();
      const normalizedCatalog = normalizeCatalog(remoteCatalog);
      if (!normalizedCatalog?.all.length) {
        throw new Error("O catálogo recebido pelo contexto está vazio.");
      }
      setCatalog(normalizedCatalog);
      catalogLogger.delivered(normalizedCatalog.all.length);
      setError(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o catálogo.";
      setError(message);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    catalogService.cached().then((cached) => {
      if (!active) return;
      if (cached) {
        setCatalog(normalizeCatalog(cached.catalog) ?? emptyCatalog());
        setLoading(false);
      }
      if (!cached || cached.stale) void refresh();
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  const safeCatalog = useMemo(
    () => normalizeCatalog(catalog) ?? emptyCatalog(),
    [catalog],
  );
  const relatedIndex = useMemo(
    () => createRelatedContentIndex(safeCatalog.all),
    [safeCatalog.all],
  );
  const value = useMemo(
    () => ({
      catalog: safeCatalog,
      loading,
      refreshing,
      error,
      relatedIndex,
      refresh,
    }),
    [error, loading, refresh, refreshing, relatedIndex, safeCatalog],
  );
  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error("useCatalog deve ser usado dentro de CatalogProvider");
  }
  return context;
}
