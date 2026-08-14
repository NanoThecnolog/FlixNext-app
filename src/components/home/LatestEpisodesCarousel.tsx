import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { appConfig } from "../../config/appConfig";
import { CatalogSeries } from "../../domain/content";
import { RootStackParamList } from "../../navigation/types";
import {
  LatestEpisode,
  latestEpisodesService,
} from "../../services/LatestEpisodesService";
import {
  navigateToDetails,
  prefetchDetails,
} from "../../navigation/detailsNavigation";
import { colors } from "../../theme";
import { titleFor } from "../../utils/contentSelectors";

interface LatestEpisodeGroup extends LatestEpisode {
  episodeNumbers: number[];
}

interface LatestEpisodesCarouselProps {
  series: CatalogSeries[];
  limit?: number;
}

const dateKeyFor = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
};

const groupEpisodes = (episodes: LatestEpisode[], limit: number) => {
  const groups = new Map<string, LatestEpisodeGroup>();

  for (const episode of episodes) {
    const key = `${episode.tmdbID}:${episode.seasonNumber}:${dateKeyFor(
      episode.addedAt,
    )}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { ...episode, episodeNumbers: [episode.episodeNumber] });
      continue;
    }
    if (!current.episodeNumbers.includes(episode.episodeNumber)) {
      current.episodeNumbers.push(episode.episodeNumber);
    }
    if (new Date(episode.addedAt) > new Date(current.addedAt)) {
      current.addedAt = episode.addedAt;
    }
  }

  return [...groups.values()]
    .sort(
      (first, second) =>
        new Date(second.addedAt).getTime() -
        new Date(first.addedAt).getTime(),
    )
    .slice(0, limit);
};

const episodeLabelFor = (episodeNumbers: number[]) => {
  const episodes = [...episodeNumbers].sort((first, second) => first - second);
  return episodes.length === 1
    ? `Episódio ${episodes[0]}`
    : `Episódios ${episodes.join(", ")}`;
};

const relativeDateFor = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Adicionado recentemente";
  const elapsedDays = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 86_400_000),
  );
  if (elapsedDays === 0) return "Adicionado hoje";
  if (elapsedDays === 1) return "Adicionado ontem";
  if (elapsedDays < 7) return `Adicionado há ${elapsedDays} dias`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const imageFor = (series: CatalogSeries, seasonNumber: number) => {
  const seasonPoster = series.tmdb?.seasons.find(
    (season) => season.season_number === seasonNumber,
  )?.poster_path;
  const path =
    seasonPoster || series.tmdb?.poster_path || series.tmdb?.backdrop_path;
  if (path) return `${appConfig.imageUrl}/w500${path}`;
  return series.mongo.overlay || series.mongo.background;
};

function LatestEpisodeCard({
  group,
  series,
  width,
}: {
  group: LatestEpisodeGroup;
  series: CatalogSeries;
  width: number;
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const primaryImage = imageFor(series, group.seasonNumber);
  const [imageUri, setImageUri] = useState(primaryImage);

  useEffect(() => setImageUri(primaryImage), [primaryImage]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver detalhes de ${titleFor(series)}`}
      onPressIn={() => prefetchDetails(series)}
      onPress={() => navigateToDetails(navigation, series)}
      style={({ pressed }) => [
        latestStyles.card,
        { width, height: Math.round((width * 3) / 2) },
        pressed && latestStyles.pressed,
      ]}
    >
      <View style={latestStyles.fallback}>
        <Text style={latestStyles.fallbackText}>FX</Text>
      </View>
      <Image
        source={{ uri: imageUri }}
        resizeMode="cover"
        fadeDuration={0}
        style={StyleSheet.absoluteFill}
        onError={() => {
          const fallback = series.mongo.overlay || series.mongo.background;
          if (imageUri !== fallback) setImageUri(fallback);
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["transparent", "rgba(5,5,7,.2)", "rgba(5,5,7,.97)"]}
        locations={[0.35, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={latestStyles.badge}>
        <Text style={latestStyles.badgeText}>NOVOS EPISÓDIOS</Text>
      </View>
      <View style={latestStyles.overlay}>
        <Text style={latestStyles.date}>{relativeDateFor(group.addedAt)}</Text>
        <Text style={latestStyles.title} numberOfLines={1}>
          {titleFor(series)}
        </Text>
        <Text style={latestStyles.episodes} numberOfLines={1}>
          T{group.seasonNumber} · {episodeLabelFor(group.episodeNumbers)}
        </Text>
      </View>
    </Pressable>
  );
}

const MemoizedLatestEpisodeCard = React.memo(LatestEpisodeCard);

export const LatestEpisodesCarousel = React.memo(
  function LatestEpisodesCarousel({
    series,
    limit = 8,
  }: LatestEpisodesCarouselProps) {
    const { width: screenWidth } = useWindowDimensions();
    const [episodes, setEpisodes] = useState<LatestEpisode[]>([]);
    const [loading, setLoading] = useState(true);
    const cardWidth = Math.min((screenWidth - 36) / 1.15, 300);
    const seriesById = useMemo(
      () => new Map(series.map((item) => [item.id, item])),
      [series],
    );

    useEffect(() => {
      let active = true;
      setLoading(true);
      void latestEpisodesService
        .list(24)
        .then((data) => {
          if (active) setEpisodes(data);
        })
        .catch(() => {
          if (active) setEpisodes([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []);

    const groups = useMemo(
      () =>
        groupEpisodes(episodes, limit).filter((group) =>
          seriesById.has(group.tmdbID),
        ),
      [episodes, limit, seriesById],
    );
    const renderItem = useCallback<ListRenderItem<LatestEpisodeGroup>>(
      ({ item }) => {
        const itemSeries = seriesById.get(item.tmdbID);
        return itemSeries ? (
          <MemoizedLatestEpisodeCard
            group={item}
            series={itemSeries}
            width={cardWidth}
          />
        ) : null;
      },
      [cardWidth, seriesById],
    );

    if (!loading && !groups.length) return null;

    return (
      <View style={latestStyles.container}>
        <Text style={latestStyles.eyebrow}>ATUALIZAÇÕES DE SÉRIES</Text>
        <Text style={latestStyles.heading}>NOVOS EPISÓDIOS DISPONÍVEIS</Text>
        {loading ? (
          <View style={latestStyles.skeletonList}>
            {[0, 1].map((index) => (
              <View
                key={index}
                style={[
                  latestStyles.skeleton,
                  { width: cardWidth, height: Math.round((cardWidth * 3) / 2) },
                ]}
              />
            ))}
          </View>
        ) : (
          <FlatList
            horizontal
            data={groups}
            renderItem={renderItem}
            keyExtractor={(group) =>
              `${group.tmdbID}:${group.seasonNumber}:${dateKeyFor(
                group.addedAt,
              )}`
            }
            showsHorizontalScrollIndicator={false}
            initialNumToRender={2}
            maxToRenderPerBatch={3}
            windowSize={3}
            contentContainerStyle={latestStyles.listContent}
            getItemLayout={(_, index) => ({
              length: cardWidth + 12,
              offset: (cardWidth + 12) * index,
              index,
            })}
          />
        )}
      </View>
    );
  },
);

const latestStyles = StyleSheet.create({
  container: {
    marginTop: 13,
    marginBottom: 4,
    paddingHorizontal: 18,
  },
  eyebrow: {
    color: colors.red,
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  heading: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 1.7,
    marginBottom: 11,
  },
  listContent: {
    paddingBottom: 12,
  },
  card: {
    marginRight: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.10)",
    borderRadius: 12,
    backgroundColor: "#181818",
  },
  pressed: {
    opacity: 0.86,
    transform: [{ translateY: -2 }],
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#231719",
  },
  fallbackText: {
    color: "rgba(255,255,255,.35)",
    fontFamily: "Montserrat_900Black",
    fontSize: 28,
  },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.red,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  badgeText: {
    color: colors.white,
    fontFamily: "Montserrat_900Black",
    fontSize: 9,
    letterSpacing: 0.75,
  },
  overlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 13,
    paddingBottom: 13,
  },
  date: {
    color: "rgba(255,255,255,.64)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
  },
  title: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    lineHeight: 18,
    marginTop: 4,
  },
  episodes: {
    color: "rgba(255,255,255,.75)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  skeletonList: {
    flexDirection: "row",
    gap: 12,
    overflow: "hidden",
  },
  skeleton: {
    flexShrink: 0,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,.065)",
  },
});
