import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { appConfig } from "../../config/appConfig";
import {
  CatalogSeries,
  MongoEpisode,
  TmdbEpisode,
} from "../../domain/content";
import { WatchedProgress } from "../../domain/user";
import { colors } from "../../theme";
import { imageFor } from "../../utils/contentSelectors";

interface SeriesEpisodeCardProps {
  series: CatalogSeries;
  episode: MongoEpisode;
  metadata?: TmdbEpisode;
  progress?: WatchedProgress;
  onPress: () => void;
}

const durationInSeconds = (metadata?: TmdbEpisode, internal?: string) => {
  if (metadata?.runtime && metadata.runtime > 0) return metadata.runtime * 60;
  const value = internal?.trim();
  if (!value) return 0;
  const parts = value.split(":").map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  const minutes = Number(value.match(/\d+/)?.[0]);
  return Number.isFinite(minutes) ? minutes * 60 : 0;
};

const durationLabel = (metadata?: TmdbEpisode, internal?: string) => {
  if (metadata?.runtime && metadata.runtime > 0) return `${metadata.runtime} min`;
  return internal?.trim() || "Duração não informada";
};

export const SeriesEpisodeCard = React.memo(function SeriesEpisodeCard({
  series,
  episode,
  metadata,
  progress,
  onPress,
}: SeriesEpisodeCardProps) {
  const image = metadata?.still_path
    ? `${appConfig.imageUrl}/w500${metadata.still_path}`
    : imageFor(series, "backdrop");
  const completed = Boolean(progress?.completed);
  const percentage = useMemo(() => {
    if (completed) return 100;
    const duration = durationInSeconds(metadata, episode.duration);
    if (!duration || !progress?.progress) return 0;
    return Math.min(100, Math.max(0, (progress.progress / duration) * 100));
  }, [completed, episode.duration, metadata, progress?.progress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Assistir episódio ${episode.ep}: ${metadata?.name ?? "Episódio"}`}
      style={({ pressed }) => [episodeStyles.card, pressed && episodeStyles.pressed]}
      onPress={onPress}
    >
      <View style={episodeStyles.imageContainer}>
        <Image source={{ uri: image }} style={episodeStyles.image} resizeMode="cover" />
        <View style={episodeStyles.imageOverlay} />
        <View style={episodeStyles.playButton}>
          <Ionicons name="play" size={22} color="#111" />
        </View>
        {metadata?.episode_type?.toLowerCase() === "finale" ? (
          <Text style={episodeStyles.finale}>Final da temporada</Text>
        ) : null}
        {progress ? (
          <View style={episodeStyles.progressTrack}>
            <View
              style={[episodeStyles.progressFill, { width: `${percentage}%` }]}
            />
          </View>
        ) : null}
      </View>

      <View style={episodeStyles.information}>
        <Text style={episodeStyles.number}>EPISÓDIO {episode.ep}</Text>
        <Text style={episodeStyles.name} numberOfLines={2}>
          {metadata?.name?.trim() || `Episódio ${episode.ep}`}
        </Text>
        <View style={episodeStyles.metadata}>
          <Text style={episodeStyles.duration}>
            {durationLabel(metadata, episode.duration)}
          </Text>
          {completed ? <Text style={episodeStyles.completed}>Assistido</Text> : null}
        </View>
        {metadata?.overview?.trim() ? (
          <Text style={episodeStyles.overview} numberOfLines={3}>
            {metadata.overview}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const episodeStyles = StyleSheet.create({
  card: {
    width: "100%",
    marginBottom: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.08)",
    borderRadius: 12,
    backgroundColor: "#18181a",
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.992 }] },
  imageContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  image: { width: "100%", height: "100%" },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,.28)",
  },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 48,
    height: 48,
    marginTop: -24,
    marginLeft: -24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,.94)",
  },
  finale: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    overflow: "hidden",
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    borderRadius: 6,
    backgroundColor: colors.red,
  },
  progressTrack: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,.2)",
  },
  progressFill: { height: "100%", backgroundColor: colors.red },
  information: { padding: 16, gap: 7 },
  number: {
    color: colors.red,
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  name: {
    color: "rgba(255,255,255,.95)",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    lineHeight: 21,
  },
  metadata: { flexDirection: "row", alignItems: "center", gap: 9 },
  duration: {
    color: "rgba(255,255,255,.48)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
  },
  completed: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: "hidden",
    color: "#6ddd98",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 10,
    borderWidth: 1,
    borderColor: "rgba(62,194,118,.2)",
    borderRadius: 999,
    backgroundColor: "rgba(62,194,118,.1)",
  },
  overview: {
    color: "rgba(255,255,255,.58)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
});
