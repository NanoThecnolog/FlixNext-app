import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { appConfig } from "../../config/appConfig";
import { useAuth } from "../../contexts/AuthContext";
import {
  CatalogItem,
  PlaybackSource,
  TmdbSeasonDetails,
} from "../../domain/content";
import { WatchHistoryEntry } from "../../domain/user";
import { RootStackParamList } from "../../navigation/types";
import { mediaDetailsService } from "../../services/MediaDetailsService";
import { progressService } from "../../services/ProgressService";
import { navigationProgressService } from "../../services/NavigationProgressService";
import {
  navigateToDetails,
  prefetchDetails,
} from "../../navigation/detailsNavigation";
import { colors } from "../../theme";
import { titleFor } from "../../utils/contentSelectors";

interface ContinueWatchingItem {
  content: CatalogItem;
  tracking: WatchHistoryEntry;
  percentage: number;
  source: PlaybackSource | null;
}

interface ContinueWatchingCarouselProps {
  items: CatalogItem[];
}

const percentageFor = (
  progress: number,
  runtimeMinutes: number | null,
  completed: boolean,
) => {
  if (completed) return 100;
  if (!runtimeMinutes || progress <= 0) return 0;
  return Math.min(100, Math.round((progress / (runtimeMinutes * 60)) * 100));
};

const durationInMinutes = (duration?: string) => {
  if (!duration) return null;
  const values = duration.split(":").map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;
  if (values.length === 3) return values[0] * 60 + values[1] + values[2] / 60;
  if (values.length === 2) return values[0] + values[1] / 60;
  const value = Number(duration);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const backdropFor = (item: CatalogItem) =>
  item.tmdb?.backdrop_path
    ? `${appConfig.imageUrl}/w500${item.tmdb.backdrop_path}`
    : item.mongo.background;

const sourceFor = (
  item: CatalogItem,
  tracking: WatchHistoryEntry,
): PlaybackSource | null => {
  if (item.kind === "movie") {
    if (!item.mongo.src) return null;
    return {
      kind: "movie",
      tmdbId: item.id,
      title: titleFor(item),
      subtitle: item.mongo.subtitle,
      uri: item.mongo.src,
      duration: item.mongo.duration,
    };
  }

  if (tracking.type !== "tv") return null;
  const season = item.mongo.season.find(
    (value) => value.s === tracking.season,
  );
  const episode = season?.episodes.find(
    (value) => value.ep === tracking.episode,
  );
  if (!season || !episode) return null;

  return {
    kind: "series",
    tmdbId: item.id,
    title: titleFor(item),
    subtitle: `Temporada ${season.s} · Episódio ${episode.ep}`,
    uri: episode.src,
    duration: episode.duration,
    season: season.s,
    episode: episode.ep,
  };
};

const runtimeFor = async (
  item: CatalogItem,
  tracking: WatchHistoryEntry,
  seasonRequests: Map<string, Promise<TmdbSeasonDetails>>,
) => {
  if (item.kind === "movie") {
    return item.tmdb?.runtime ?? durationInMinutes(item.mongo.duration);
  }
  if (
    tracking.type !== "tv" ||
    tracking.season === undefined ||
    tracking.episode === undefined
  ) {
    return null;
  }

  const databaseEpisode = item.mongo.season
    .find((season) => season.s === tracking.season)
    ?.episodes.find((episode) => episode.ep === tracking.episode);
  const databaseRuntime = durationInMinutes(databaseEpisode?.duration);

  try {
    const requestKey = `${item.id}:${tracking.season}`;
    let seasonRequest = seasonRequests.get(requestKey);
    if (!seasonRequest) {
      seasonRequest = mediaDetailsService.loadSeason(item.id, tracking.season);
      seasonRequests.set(requestKey, seasonRequest);
    }
    const season = await seasonRequest;
    const runtime = season.episodes.find(
      (episode) => episode.episode_number === tracking.episode,
    )?.runtime;
    if (runtime && runtime > 0) return runtime;
  } catch {
    // A duração interna é usada somente quando o TMDB estiver indisponível.
  }
  return databaseRuntime;
};

function ContinueWatchingCard({
  entry,
  width,
}: {
  entry: ContinueWatchingItem;
  width: number;
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { content, tracking, percentage, source } = entry;
  const primaryImage = backdropFor(content);
  const [imageUri, setImageUri] = useState(primaryImage);
  const progress = content.kind === "movie" && percentage >= 92
    ? 100
    : percentage > 95
      ? 100
      : percentage;

  useEffect(() => setImageUri(primaryImage), [primaryImage]);

  const open = () => {
    if (content.kind === "movie" && percentage >= 92) {
      navigateToDetails(navigation, content);
      return;
    }
    if (source) {
      navigationProgressService.run(() =>
        navigation.navigate("Player", { source }),
      );
      return;
    }
    navigateToDetails(navigation, content);
  };

  const metadata =
    tracking.type === "tv"
      ? `Temporada ${tracking.season ?? "—"}  •  Episódio ${tracking.episode ?? "—"}`
      : percentage > 4
        ? `Filme  •  ${progress}% assistido`
        : "Filme";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continuar assistindo ${titleFor(content)}`}
      onPressIn={() => prefetchDetails(content)}
      onPress={open}
      style={({ pressed }) => [
        cardStyles.card,
        { width, height: Math.round((width * 9) / 16) },
        pressed && cardStyles.pressed,
      ]}
    >
      <Image
        source={{ uri: imageUri }}
        resizeMode="cover"
        fadeDuration={0}
        style={StyleSheet.absoluteFill}
        onError={() => {
          if (imageUri !== content.mongo.background) {
            setImageUri(content.mongo.background);
          }
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["transparent", "rgba(0,0,0,.28)", "rgba(0,0,0,.96)"]}
        locations={[0.25, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={cardStyles.information}>
        <Text style={cardStyles.cardTitle} numberOfLines={1}>
          {titleFor(content)}
        </Text>
        <Text style={cardStyles.metadata} numberOfLines={1}>
          {metadata}
        </Text>
      </View>
      {percentage > 4 ? (
        <View style={cardStyles.progressTrack}>
          <View style={[cardStyles.progressFill, { width: `${progress}%` }]} />
        </View>
      ) : null}
    </Pressable>
  );
}

const MemoizedCard = React.memo(ContinueWatchingCard);

export const ContinueWatchingCarousel = React.memo(
  function ContinueWatchingCarousel({ items }: ContinueWatchingCarouselProps) {
    const { user } = useAuth();
    const isFocused = useIsFocused();
    const { width: screenWidth } = useWindowDimensions();
    const [cards, setCards] = useState<ContinueWatchingItem[]>([]);
    const [revision, setRevision] = useState(0);
    const requestId = useRef(0);
    const cardWidth = Math.min(screenWidth - 36, 360);
    const contentByKey = useMemo(
      () =>
        new Map(items.map((item) => [`${item.kind}:${item.id}`, item])),
      [items],
    );

    useEffect(
      () => progressService.subscribe(() => setRevision((value) => value + 1)),
      [],
    );

    useEffect(() => {
      if (!user) {
        setCards([]);
        return;
      }
      if (!isFocused || contentByKey.size === 0) return;

      const currentRequest = ++requestId.current;
      const load = async () => {
        const seasonRequests = new Map<
          string,
          Promise<TmdbSeasonDetails>
        >();
        const history = await progressService.list();
        const available = history
          .map((tracking) => {
            const kind = tracking.type === "movie" ? "movie" : "series";
            const content = contentByKey.get(`${kind}:${Number(tracking.tmdbID)}`);
            return content ? { content, tracking } : null;
          })
          .filter(
            (entry): entry is {
              content: CatalogItem;
              tracking: WatchHistoryEntry;
            } => entry !== null,
          )
          .slice(0, 12);

        const baseCards = available.map(({ content, tracking }) => ({
          content,
          tracking,
          source: sourceFor(content, tracking),
          percentage: 0,
        }));
        if (requestId.current === currentRequest) setCards(baseCards);

        const results = await Promise.allSettled(
          available.map(async ({ content, tracking }) => {
            const [progressEntries, runtime] = await Promise.all([
              progressService.byContent(content.id),
              runtimeFor(content, tracking, seasonRequests),
            ]);
            const progressEntry = progressEntries.find((entry) => {
              if (entry.mediaType !== tracking.type) return false;
              if (tracking.type === "movie") return true;
              return (
                entry.season === tracking.season &&
                entry.episode === tracking.episode
              );
            });

            return {
              content,
              tracking,
              source: sourceFor(content, tracking),
              percentage: percentageFor(
                progressEntry?.progress ?? 0,
                runtime,
                Boolean(progressEntry?.completed),
              ),
            };
          }),
        );
        const loaded = results.map((result, index) =>
          result.status === "fulfilled" ? result.value : baseCards[index],
        );

        if (requestId.current === currentRequest) setCards(loaded);
      };

      void load().catch(() => {
        if (requestId.current === currentRequest) setCards([]);
      });
      return () => {
        requestId.current += 1;
      };
    }, [contentByKey, isFocused, revision, user]);

    const renderItem = useCallback<ListRenderItem<ContinueWatchingItem>>(
      ({ item }) => <MemoizedCard entry={item} width={cardWidth} />,
      [cardWidth],
    );

    if (!cards.length) return null;

    return (
      <View style={cardStyles.container}>
        <Text style={cardStyles.eyebrow}>CONTINUE ASSISTINDO</Text>
        <Text style={cardStyles.heading}>ONDE VOCÊ PAROU</Text>
        <FlatList
          horizontal
          data={cards}
          renderItem={renderItem}
          keyExtractor={(entry) =>
            `${entry.tracking.type}:${entry.content.id}:${
              entry.tracking.type === "tv" ? entry.tracking.season : ""
            }:${entry.tracking.type === "tv" ? entry.tracking.episode : ""}:${
              entry.tracking.id
            }`
          }
          showsHorizontalScrollIndicator={false}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={3}
          contentContainerStyle={cardStyles.listContent}
          getItemLayout={(_, index) => ({
            length: cardWidth + 8,
            offset: (cardWidth + 8) * index,
            index,
          })}
        />
      </View>
    );
  },
);

const cardStyles = StyleSheet.create({
  container: {
    marginTop: 25,
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
    letterSpacing: 2.1,
    marginBottom: 11,
  },
  listContent: {
    paddingBottom: 12,
  },
  card: {
    marginRight: 8,
    overflow: "hidden",
    borderRadius: 7,
    backgroundColor: "#111",
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  information: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 10,
    paddingBottom: 13,
  },
  cardTitle: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    lineHeight: 17,
    textShadowColor: "rgba(0,0,0,.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  metadata: {
    color: "rgba(255,255,255,.78)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 14,
    marginTop: 3,
  },
  progressTrack: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    height: 4,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,.18)",
  },
  progressFill: {
    height: "100%",
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: colors.red,
  },
});
