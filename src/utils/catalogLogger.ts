import axios from "axios";

const enabled = __DEV__ && process.env.EXPO_PUBLIC_DEBUG_CATALOG !== "false";
const prefix = "[FlixNext:Catalog]";

const log = (message: string) => {
  if (enabled) console.log(`${prefix} ${message}`);
};

export const catalogLogger = {
  cache(source: "memory" | "storage" | "miss" | "invalid", report = "") {
    log(`Cache: ${source}${report ? ` | ${report}` : ""}`);
  },

  request(label: string, path: string) {
    log(`${label} → GET ${path}`);
  },

  loaded(label: string, path: string, durationMs: number, report: string) {
    log(`${label} ✓ ${durationMs}ms | ${path} | ${report}`);
  },

  failed(label: string, path: string, durationMs: number, error: unknown) {
    if (!enabled) return;
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `${prefix} ${label} ✕ ${durationMs}ms | ${path} | status=${status ?? "n/a"} | ${message}`,
    );
  },

  mapped(report: string) {
    log(`MongoDB + TMDB ✓ ${report}`);
  },

  delivered(items: number) {
    log(`Contexto ✓ catálogo entregue | itens=${items}`);
  },

  cacheFailed(operation: "leitura" | "gravação", error: unknown) {
    if (!enabled) return;
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${prefix} Cache ${operation} falhou | ${message}`);
  },
};
