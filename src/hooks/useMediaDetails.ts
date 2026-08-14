import { useEffect, useState } from "react";
import { CatalogItem } from "../domain/content";
import {
  MediaDetails,
  mediaDetailsService,
} from "../services/MediaDetailsService";

export function useMediaDetails(item: CatalogItem) {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDetails(null);
    mediaDetailsService
      .load(item)
      .then((value) => active && setDetails(value))
      .catch(() => active && setError("Detalhes adicionais indisponíveis."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [item]);

  return { details, loading, error };
}
