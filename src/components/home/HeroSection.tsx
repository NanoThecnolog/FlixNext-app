import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { trailerUrlFor } from "../../config/featuredContent";
import { CatalogItem, PlaybackSource } from "../../domain/content";
import { RootStackParamList } from "../../navigation/types";
import { navigationProgressService } from "../../services/NavigationProgressService";
import {
  navigateToDetails,
  prefetchDetails,
} from "../../navigation/detailsNavigation";
import { colors } from "../../theme";
import {
  descriptionFor,
  genresFor,
  imageFor,
  titleFor,
} from "../../utils/contentSelectors";

const AnimatedVideo = Animated.createAnimatedComponent(Video);
const TRAILER_DELAY_MS = 2_200;
const NEXT_SLIDE_DELAY_MS = 3_000;

const fallbackPosterFor = (item: CatalogItem) =>
  item.mongo.overlay || item.mongo.background;

interface HeroSectionProps {
  items: CatalogItem[];
  isActive: boolean;
}

export const HeroSection = React.memo(function HeroSection({
  items,
  isActive,
}: HeroSectionProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { height: screenHeight } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadTrailer, setLoadTrailer] = useState(false);
  const [trailerVisible, setTrailerVisible] = useState(false);
  const [trailerFailed, setTrailerFailed] = useState(false);
  const [loadedPosterUri, setLoadedPosterUri] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const imageOpacity = useRef(new Animated.Value(1)).current;
  const videoOpacity = useRef(new Animated.Value(0)).current;
  const informationProgress = useRef(new Animated.Value(0)).current;
  const slideOpacity = useRef(new Animated.Value(1)).current;
  const slideTranslateX = useRef(new Animated.Value(0)).current;
  const ended = useRef(false);
  const transitioning = useRef(false);
  const failedPosterUris = useRef(new Set<string>());
  const [, refreshPoster] = useState(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const item = items[activeIndex] ?? items[0];
  const heroHeight = Math.max(560, Math.min(screenHeight - 112, 700));

  const showImage = useCallback(() => {
    setTrailerVisible(false);
    Animated.parallel([
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(videoOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
    Animated.timing(informationProgress, {
      toValue: 0,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [imageOpacity, informationProgress, videoOpacity]);

  const showVideo = useCallback(() => {
    setTrailerVisible(true);
    Animated.parallel([
      Animated.timing(imageOpacity, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(videoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
    Animated.timing(informationProgress, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [imageOpacity, informationProgress, videoOpacity]);

  const posterUriFor = useCallback((content: CatalogItem) => {
    const primaryUri = imageFor(content);
    return failedPosterUris.current.has(primaryUri)
      ? fallbackPosterFor(content)
      : primaryUri;
  }, []);

  const warmPoster = useCallback(async (content: CatalogItem) => {
    const primaryUri = imageFor(content);

    try {
      if (await Image.prefetch(primaryUri)) return;
    } catch {
      // A imagem do MongoDB abaixo será usada como fallback.
    }

    failedPosterUris.current.add(primaryUri);
    const fallbackUri = fallbackPosterFor(content);
    if (!fallbackUri || fallbackUri === primaryUri) return;

    try {
      await Image.prefetch(fallbackUri);
    } catch {
      // O componente Image mantém seu tratamento nativo de erro.
    }
  }, []);
  const posterUri = item ? posterUriFor(item) : null;

  const moveSlide = useCallback(
    (direction: 1 | -1 = 1) => {
      if (items.length < 2 || transitioning.current) return;
      transitioning.current = true;

      const targetIndex =
        (activeIndex + direction + items.length) % items.length;

      void warmPoster(items[targetIndex]).finally(() => {
        Animated.parallel([
          Animated.timing(slideOpacity, {
            toValue: 0,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.timing(slideTranslateX, {
            toValue: direction * -28,
            duration: 320,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (!finished) {
            transitioning.current = false;
            return;
          }

          setActiveIndex(targetIndex);
          slideTranslateX.setValue(direction * 28);

          requestAnimationFrame(() => {
            Animated.parallel([
              Animated.timing(slideOpacity, {
                toValue: 1,
                duration: 620,
                useNativeDriver: true,
              }),
              Animated.timing(slideTranslateX, {
                toValue: 0,
                duration: 620,
                useNativeDriver: true,
              }),
            ]).start(() => {
              transitioning.current = false;
            });
          });
        });
      });
    },
    [
      activeIndex,
      items,
      slideOpacity,
      slideTranslateX,
      warmPoster,
    ],
  );

  useEffect(() => {
    if (activeIndex < items.length) return;
    setActiveIndex(0);
  }, [activeIndex, items.length]);

  useEffect(() => {
    if (items.length < 2) return;
    const nextIndex = (activeIndex + 1) % items.length;
    const previousIndex =
      (activeIndex - 1 + items.length) % items.length;
    void warmPoster(items[nextIndex]);
    void warmPoster(items[previousIndex]);
  }, [activeIndex, items, warmPoster]);

  useEffect(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    ended.current = false;
    setLoadTrailer(false);
    setTrailerFailed(false);
    showImage();
    if (!isActive || !item || loadedPosterUri !== posterUri) return;
    const timer = setTimeout(() => setLoadTrailer(true), TRAILER_DELAY_MS);
    return () => {
      clearTimeout(timer);
      if (advanceTimer.current) {
        clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
    };
  }, [isActive, item, loadedPosterUri, posterUri, showImage]);

  const handleStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded || ended.current) return;

      const reachedEnd =
        status.didJustFinish ||
        (typeof status.durationMillis === "number" &&
          status.durationMillis > 0 &&
          status.positionMillis >= status.durationMillis - 350 &&
          !status.isPlaying &&
          !status.isBuffering);

      if (!reachedEnd) return;
      ended.current = true;
      showImage();
      setLoadTrailer(false);
      advanceTimer.current = setTimeout(
        () => moveSlide(1),
        NEXT_SLIDE_DELAY_MS,
      );
    },
    [moveSlide, showImage],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 18 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -45) moveSlide(1);
          if (gesture.dx > 45) moveSlide(-1);
        },
      }),
    [moveSlide],
  );

  const playbackSource = useMemo<PlaybackSource | null>(() => {
    if (!item) return null;
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
    const season = item.mongo.season[0];
    const episode = season?.episodes[0];
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
  }, [item]);

  if (!item) return null;

  const seasons = item.kind === "series" ? item.mongo.season.length : 0;
  const genreTranslations: Record<string, string> = {
    "Action & Adventure": "Ação e Aventura",
    "Sci-Fi & Fantasy": "Ficção Científica e Fantasia",
    Thriller: "Suspense",
  };
  const genreLabel = genresFor(item)
    .slice(0, 3)
    .map((genre) => genreTranslations[genre] ?? genre)
    .join(" - ");

  return (
    <View
      style={[heroStyles.container, { height: heroHeight }]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[
          heroStyles.slide,
          {
            opacity: slideOpacity,
            transform: [{ translateX: slideTranslateX }],
          },
        ]}
      >
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: imageOpacity }]}
      >
        <Image
          source={{ uri: posterUri ?? undefined }}
          resizeMode="cover"
          fadeDuration={0}
          style={StyleSheet.absoluteFill}
          onLoad={() => setLoadedPosterUri(posterUri)}
          onError={() => {
            const primaryUri = imageFor(item);
            const fallbackUri = fallbackPosterFor(item);
            if (posterUri !== primaryUri || fallbackUri === primaryUri) return;
            failedPosterUris.current.add(primaryUri);
            refreshPoster((revision) => revision + 1);
          }}
        />
      </Animated.View>

      {loadTrailer && !trailerFailed ? (
        <AnimatedVideo
          key={`trailer-${item.kind}-${item.id}`}
          source={{ uri: trailerUrlFor(item.id) }}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isMuted={muted}
          volume={0.5}
          progressUpdateIntervalMillis={250}
          useNativeControls={false}
          style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}
          onReadyForDisplay={showVideo}
          onPlaybackStatusUpdate={handleStatus}
          onError={() => {
            setTrailerFailed(true);
            setLoadTrailer(false);
            showImage();
          }}
        />
      ) : null}

      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(0,0,0,0.03)",
          "rgba(0,0,0,0.10)",
          "rgba(8,8,8,0.68)",
          "rgba(20,20,20,0.98)",
          colors.background,
        ]}
        locations={[0, 0.3, 0.61, 0.86, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.28)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {trailerVisible ? (
        <Pressable
          accessibilityLabel={
            muted ? "Ativar som do trailer" : "Silenciar trailer"
          }
          style={heroStyles.muteButton}
          onPress={() => setMuted((value) => !value)}
        >
          <Ionicons
            name={muted ? "volume-mute" : "volume-high"}
            size={22}
            color={colors.white}
          />
        </Pressable>
      ) : null}

      <Animated.View
        style={[
          heroStyles.content,
          {
            transform: [
              {
                translateY: informationProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 16],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={heroStyles.featured}>DESTAQUE FLIXNEXT</Text>
        <Animated.Text
          style={[
            heroStyles.title,
            {
              fontSize: informationProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [37, 32],
              }),
            },
          ]}
          numberOfLines={2}
        >
          {titleFor(item)}
        </Animated.Text>
        {item.mongo.subtitle ? (
          <Text style={heroStyles.subtitle} numberOfLines={1}>
            {item.mongo.subtitle}
          </Text>
        ) : null}

        <View style={heroStyles.metadata}>
          {seasons ? (
            <Text style={heroStyles.metadataText}>
              {seasons} {seasons === 1 ? "temporada" : "temporadas"}
            </Text>
          ) : null}
          <Text style={heroStyles.metadataText} numberOfLines={1}>
            {genreLabel}
          </Text>
          <View style={heroStyles.ratingBadge}>
            <Text style={heroStyles.ratingText}>{item.mongo.faixa}</Text>
          </View>
        </View>

        <Animated.Text
          style={[
            heroStyles.description,
            {
              maxHeight: informationProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [57, 0],
              }),
              marginTop: informationProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
              opacity: informationProgress.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [1, 0.15, 0],
              }),
              transform: [
                {
                  translateY: informationProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 10],
                  }),
                },
              ],
            },
          ]}
          numberOfLines={3}
        >
          {descriptionFor(item)}
        </Animated.Text>

        <View style={heroStyles.actions}>
          <Pressable
            style={[
              heroStyles.watchButton,
              !playbackSource && heroStyles.disabledButton,
            ]}
            disabled={!playbackSource}
            onPress={() =>
              playbackSource &&
              navigationProgressService.run(() =>
                navigation.navigate("Player", { source: playbackSource }),
              )
            }
          >
            <Ionicons name="play" size={17} color="#111" />
            <Text style={heroStyles.watchText}>Assistir</Text>
          </Pressable>
          <Pressable
            style={heroStyles.infoButton}
            onPressIn={() => prefetchDetails(item)}
            onPress={() => navigateToDetails(navigation, item)}
          >
            <Ionicons
              name="information-circle"
              size={18}
              color={colors.white}
            />
            <Text style={heroStyles.infoText}>Mais informações</Text>
          </Pressable>
        </View>
      </Animated.View>
      </Animated.View>
    </View>
  );
});

const heroStyles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 560,
    overflow: "hidden",
    backgroundColor: "#000",
    justifyContent: "flex-end",
  },
  slide: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  content: {
    width: "100%",
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  featured: {
    fontFamily: "Montserrat_900Black",
    color: "#ff737b",
    fontSize: 10,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  title: {
    fontFamily: "Montserrat_900Black",
    maxWidth: "95%",
    color: "rgba(255,255,255,.98)",
    fontSize: 37,
    lineHeight: 38,
    letterSpacing: -1.7,
    textShadowColor: "rgba(0,0,0,.9)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontFamily: "Montserrat_600SemiBold",
    maxWidth: "92%",
    marginTop: 7,
    color: "rgba(255,255,255,.76)",
    fontSize: 14,
  },
  metadata: {
    maxWidth: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
  },
  metadataText: {
    fontFamily: "Montserrat_700Bold",
    maxWidth: "72%",
    color: "rgba(255,255,255,.78)",
    fontSize: 11,
  },
  ratingBadge: {
    minWidth: 32,
    height: 29,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.52)",
    backgroundColor: "rgba(20,20,20,.48)",
  },
  ratingText: {
    fontFamily: "Montserrat_700Bold",
    color: colors.white,
    fontSize: 11,
  },
  description: {
    fontFamily: "Montserrat_400Regular",
    maxWidth: "100%",
    overflow: "hidden",
    marginTop: 14,
    color: "rgba(255,255,255,.78)",
    fontSize: 12.5,
    lineHeight: 19,
    textShadowColor: "rgba(0,0,0,.95)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  actions: {
    width: "100%",
    flexDirection: "row",
    gap: 9,
    marginTop: 20,
  },
  watchButton: {
    minHeight: 44,
    flex: 0.82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,.96)",
  },
  infoButton: {
    minHeight: 44,
    flex: 1.18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.15)",
    backgroundColor: "rgba(35,35,35,.72)",
  },
  disabledButton: { opacity: 0.5 },
  watchText: {
    color: "#111",
    fontFamily: "Montserrat_900Black",
    fontSize: 12,
  },
  infoText: {
    color: "rgba(255,255,255,.92)",
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
  },
  muteButton: {
    position: "absolute",
    zIndex: 20,
    top: 14,
    right: 14,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.18)",
    backgroundColor: "rgba(8,8,8,.62)",
  },
});
