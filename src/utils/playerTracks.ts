import { SubtitleTrack } from "expo-video";
import { languageKey } from "./language";

export type SubtitleTrackType = "forced" | "full" | "unknown";

export const subtitleTrackType = (
  track: Pick<SubtitleTrack, "label" | "id">,
): SubtitleTrackType => {
  const descriptor = languageKey(`${track.label ?? ""} ${track.id ?? ""}`);
  if (descriptor.includes("FORCED") || descriptor.includes("FORCADA")) {
    return "forced";
  }
  if (
    descriptor.includes("FULL") ||
    descriptor.includes("SDH") ||
    descriptor.includes("COMPLETE") ||
    descriptor.includes("COMPLETA")
  ) {
    return "full";
  }
  return "unknown";
};

export const subtitleTrackTypeLabel = (type: SubtitleTrackType) => {
  if (type === "forced") return "Forçada";
  if (type === "full") return "Completa";
  return "Tipo não informado";
};
