import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PeopleCarousel } from "../components/details/PeopleCarousel";
import { SeriesEpisodeCard } from "../components/details/SeriesEpisodeCard";
import MediaRow from "../components/MediaRow";
import { appConfig } from "../config/appConfig";
import { useCatalog } from "../contexts/CatalogContext";
import { useLibrary } from "../contexts/LibraryContext";
import {
  CatalogMovie,
  CatalogSeries,
  MongoEpisode,
  MongoSeason,
  TmdbMovie,
  TmdbPerson,
  TmdbSeasonDetails,
  TmdbSeries,
} from "../domain/content";
import { WatchedProgress } from "../domain/user";
import { useMediaDetails } from "../hooks/useMediaDetails";
import { RootStackParamList } from "../navigation/types";
import { mediaDetailsService } from "../services/MediaDetailsService";
import { navigationProgressService } from "../services/NavigationProgressService";
import { navigationMetricsService } from "../services/NavigationMetricsService";
import { progressService } from "../services/ProgressService";
import { trailerService } from "../services/TrailerService";
import { colors } from "../theme";
import {
  descriptionFor,
  genresFor,
  imageFor,
  titleFor,
} from "../utils/contentSelectors";
import { getRelatedContent } from "../utils/relatedContent";

type Props = NativeStackScreenProps<RootStackParamList, "Details">;

const translatedStatuses: Record<string, string> = {
  "Returning Series": "Em exibição",
  Ended: "Finalizada",
  Canceled: "Cancelada",
  "In Production": "Em produção",
  Planned: "Planejada",
  Pilot: "Piloto",
};

const seasonLanguage = (language?: string) => {
  const normalized = language?.trim().toLowerCase();
  if (normalized === "dub") return "Dublado";
  if (normalized === "leg") return "Legendado";
  return language?.trim() || "";
};

const SectionHeading = ({ title }: { title: string }) => (
  <View style={detailStyles.sectionHeading}>
    <View style={detailStyles.sectionMarker} />
    <Text style={detailStyles.sectionTitle}>{title}</Text>
  </View>
);

const formatMovieDuration = (duration?: string, runtime?: number) => {
  const catalogDuration = duration?.trim();
  if (catalogDuration) return catalogDuration;
  if (!runtime || runtime <= 0) return null;
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return hours ? `${hours}h${minutes ? ` ${minutes}m` : ""}` : `${minutes}m`;
};

const formatRevenue = (revenue?: number) => {
  if (!revenue || revenue <= 0) return null;
  const units = [
    { value: 1_000_000_000, singular: "bilhão", plural: "bilhões" },
    { value: 1_000_000, singular: "milhão", plural: "milhões" },
    { value: 1_000, singular: "mil", plural: "mil" },
  ];
  const unit = units.find(({ value }) => revenue >= value);
  if (!unit) {
    return `US$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(revenue)}`;
  }
  const amount = revenue / unit.value;
  const value = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(amount);
  return `US$ ${value} ${amount === 1 ? unit.singular : unit.plural}`;
};

const crewDepartmentOrder = [
  "Directing",
  "Writing",
  "Production",
  "Camera",
  "Editing",
  "Sound",
  "Art",
  "Costume & Make-Up",
  "Visual Effects",
  "Lighting",
  "Crew",
];

const crewDepartmentLabels: Record<string, string> = {
  Directing: "Direção",
  Writing: "Roteiristas",
  Production: "Produção",
  Camera: "Câmera",
  Editing: "Edição",
  Sound: "Som",
  Art: "Arte",
  "Costume & Make-Up": "Figurino e maquiagem",
  "Visual Effects": "Efeitos visuais",
  Lighting: "Iluminação",
  Crew: "Equipe",
};

const groupMovieCrew = (people: TmdbPerson[]) => {
  const groups = new Map<string, TmdbPerson[]>();
  people.forEach((person) => {
    const department = person.department?.trim();
    if (!department) return;
    const members = groups.get(department) ?? [];
    if (!members.some((member) => member.id === person.id && member.job === person.job)) {
      members.push(person);
      groups.set(department, members);
    }
  });
  return [...groups.entries()].sort(([first], [second]) => {
    const firstIndex = crewDepartmentOrder.indexOf(first);
    const secondIndex = crewDepartmentOrder.indexOf(second);
    const firstOrder = firstIndex < 0 ? 99 : firstIndex;
    const secondOrder = secondIndex < 0 ? 99 : secondIndex;
    return firstOrder - secondOrder || first.localeCompare(second, "pt-BR");
  });
};

function SeriesDetails({
  item,
  navigation,
  secondaryReady,
}: {
  item: CatalogSeries;
  navigation: Props["navigation"];
  secondaryReady: boolean;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { relatedIndex } = useCatalog();
  const { details, loading: detailsLoading, error } = useMediaDetails(item);
  const { contains, toggle, loading: libraryLoading } = useLibrary();
  const seasons = useMemo(
    () => [...item.mongo.season].sort((first, second) => first.s - second.s),
    [item.mongo.season],
  );
  const defaultSeason =
    seasons.find((season) => season.s === 1)?.s ?? seasons[0]?.s ?? 0;
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);
  const [seasonDetails, setSeasonDetails] = useState<TmdbSeasonDetails | null>(
    null,
  );
  const loadedSeasons = useRef(new Map<number, TmdbSeasonDetails>());
  const seasonListRef = useRef<FlatList<MongoSeason>>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [progressEntries, setProgressEntries] = useState<WatchedProgress[]>([]);
  const onList = contains(item.id);

  const metadata = useMemo<TmdbSeries | null>(() => {
    const loaded = details?.metadata;
    if (loaded && "name" in loaded) return loaded;
    return item.tmdb;
  }, [details?.metadata, item.tmdb]);

  useEffect(() => {
    loadedSeasons.current.clear();
    setSeasonDetails(null);
    setSelectedSeason(defaultSeason);
    const frame = requestAnimationFrame(() => {
      seasonListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [defaultSeason, item.id]);

  useEffect(() => {
    if (!selectedSeason) return;
    const loadedSeason = loadedSeasons.current.get(selectedSeason);
    if (loadedSeason) {
      setSeasonDetails(loadedSeason);
      setSeasonLoading(false);
      return;
    }
    let active = true;
    const expectedEpisodeCount = item.tmdb?.seasons.find(
      (season) => season.season_number === selectedSeason,
    )?.episode_count;
    setSeasonLoading(true);
    setSeasonDetails(null);
    mediaDetailsService
      .loadSeason(item.id, selectedSeason, { expectedEpisodeCount })
      .then((value) => {
        if (!active) return;
        loadedSeasons.current.set(selectedSeason, value);
        setSeasonDetails(value);
      })
      .catch((loadError) => {
        if (__DEV__) {
          const message =
            loadError instanceof Error ? loadError.message : String(loadError);
          console.warn(
            `[FlixNext:Details] Temporada falhou | série=${item.id} | temporada=${selectedSeason} | ${message}`,
          );
        }
        if (active) setSeasonDetails(null);
      })
      .finally(() => active && setSeasonLoading(false));
    return () => {
      active = false;
    };
  }, [item.id, item.tmdb?.seasons, selectedSeason]);

  useEffect(() => {
    let active = true;
    const loadProgress = () => {
      progressService
        .byContent(item.id)
        .then((entries) => active && setProgressEntries(entries))
        .catch(() => active && setProgressEntries([]));
    };
    loadProgress();
    const unsubscribe = progressService.subscribe(loadProgress);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [item.id]);

  const currentSeason = item.mongo.season.find(
    (season) => season.s === selectedSeason,
  );
  const firstSeason = [...item.mongo.season]
    .sort((first, second) => first.s - second.s)
    .find((season) => season.episodes.some((episode) => Boolean(episode.src)));
  const firstEpisode = firstSeason?.episodes
    .slice()
    .sort((first, second) => first.ep - second.ep)
    .find((episode) => Boolean(episode.src));

  const playEpisode = useCallback(
    (season: number, episodeNumber: number) => {
      const databaseEpisode = item.mongo.season
        .find((entry) => entry.s === season)
        ?.episodes.find((episode) => episode.ep === episodeNumber);

      if (!databaseEpisode?.src) return;

      const duplicatedSource = item.mongo.season
        .flatMap((entry) =>
          entry.episodes.map((episode) => ({ entry, episode })),
        )
        .find(
          ({ entry, episode }) =>
            episode.src === databaseEpisode.src &&
            (entry.s !== season || episode.ep !== episodeNumber),
        );
      if (__DEV__ && duplicatedSource) {
        console.warn(
          `[FlixNext:Playback] Fonte duplicada | série=${item.id} | solicitado=T${season}E${episodeNumber} | também=T${duplicatedSource.entry.s}E${duplicatedSource.episode.ep}`,
        );
      }

      const episodeMetadata =
        season === selectedSeason
          ? seasonDetails?.episodes.find(
              (episode) => episode.episode_number === episodeNumber,
            )
          : undefined;
      if (__DEV__) {
        console.log(
          `[FlixNext:Playback] Abrindo episódio | série=${item.id} | temporada=${season} | episódio=${episodeNumber}`,
        );
      }
      navigationProgressService.run(() =>
        navigation.navigate("Player", {
          source: {
            kind: "series",
            tmdbId: item.id,
            title: titleFor(item),
            subtitle: `Temporada ${season} · Episódio ${episodeNumber}${
              episodeMetadata?.name ? ` · ${episodeMetadata.name}` : ""
            }`,
            uri: databaseEpisode.src,
            duration: databaseEpisode.duration,
            season,
            episode: episodeNumber,
          },
        }),
      );
    },
    [item, navigation, seasonDetails?.episodes, selectedSeason],
  );

  const visibleEpisodes = useMemo(
    () =>
      currentSeason?.episodes
        .slice()
        .sort((first, second) => first.ep - second.ep) ?? [],
    [currentSeason],
  );
  const metadataByEpisode = useMemo(
    () =>
      new Map(
        seasonDetails?.episodes.map((episode) => [
          episode.episode_number,
          episode,
        ]) ?? [],
      ),
    [seasonDetails?.episodes],
  );
  const progressByEpisode = useMemo(
    () =>
      new Map(
        progressEntries
          .filter(
            (entry) =>
              entry.mediaType === "tv" && entry.season === selectedSeason,
          )
          .map((entry) => [entry.episode, entry]),
      ),
    [progressEntries, selectedSeason],
  );
  const renderEpisode = useCallback(
    ({ item: episode }: { item: MongoEpisode }) => (
      <View style={detailStyles.episodeRow}>
        <SeriesEpisodeCard
          series={item}
          episode={episode}
          metadata={metadataByEpisode.get(episode.ep)}
          progress={progressByEpisode.get(episode.ep)}
          onPress={() => playEpisode(selectedSeason, episode.ep)}
        />
      </View>
    ),
    [item, metadataByEpisode, playEpisode, progressByEpisode, selectedSeason],
  );

  const cast = secondaryReady
    ? (details?.credits?.cast.slice(0, 16) ?? [])
    : [];
  const crew = useMemo(
    () =>
      secondaryReady
        ? details?.credits?.crew
        .filter((person) =>
          [
            "Director",
            "Writer",
            "Screenplay",
            "Executive Producer",
            "Creator",
          ].includes(person.job ?? ""),
        )
        .slice(0, 14) ?? []
        : [],
    [details?.credits?.crew, secondaryReady],
  );
  const related = useMemo(
    () => (secondaryReady ? getRelatedContent(item, relatedIndex) : []),
    [item, relatedIndex, secondaryReady],
  );
  const releaseYear = metadata?.first_air_date?.slice(0, 4);
  const status = metadata?.status
    ? (translatedStatuses[metadata.status] ?? metadata.status)
    : null;
  const seasonsLabel = `${item.mongo.season.length} ${
    item.mongo.season.length === 1 ? "temporada" : "temporadas"
  }`;

  return (
    <SafeAreaView style={detailStyles.screen} edges={["left", "right"]}>
      <FlatList
        data={visibleEpisodes}
        keyExtractor={(episode) => `${selectedSeason}:${episode.ep}`}
        renderItem={renderEpisode}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={40}
        windowSize={5}
        contentContainerStyle={detailStyles.scrollContent}
        ListHeaderComponent={
          <>
        <View
          style={[
            detailStyles.seriesHero,
            { minHeight: Math.max(680, height * 0.92) },
          ]}
        >
          <Image
            source={{ uri: imageFor(item, "poster") }}
            style={detailStyles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(20,20,20,.05)", "rgba(20,20,20,.38)", "#141414"]}
            locations={[0.15, 0.55, 0.93]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(0,0,0,.38)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.75, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />

          <Pressable
            accessibilityLabel="Voltar"
            style={[detailStyles.backButton, { top: Math.max(insets.top, 12) }]}
            onPress={navigation.goBack}
          >
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </Pressable>

          <View style={detailStyles.heroInformation}>
            <Text style={detailStyles.heroTitle}>{titleFor(item)}</Text>
            {item.mongo.subtitle?.trim() ? (
              <Text style={detailStyles.heroSubtitle}>
                {item.mongo.subtitle}
              </Text>
            ) : null}

            <View style={detailStyles.metadataLine}>
              <Text style={detailStyles.metadataText}>{seasonsLabel}</Text>
              {releaseYear ? (
                <Text style={detailStyles.metadataDot}>•</Text>
              ) : null}
              {releaseYear ? (
                <Text style={detailStyles.metadataText}>{releaseYear}</Text>
              ) : null}
              {status ? <Text style={detailStyles.metadataDot}>•</Text> : null}
              {status ? (
                <Text style={detailStyles.metadataText}>{status}</Text>
              ) : null}
            </View>

            <View style={detailStyles.genreList}>
              {genresFor(item).map((genre) => (
                <View key={genre} style={detailStyles.genreChip}>
                  <Text style={detailStyles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>

            <View style={detailStyles.tmdbInformation}>
              {item.mongo.news ? (
                <Text style={detailStyles.newsBadge}>
                  {item.mongo.news === "new"
                    ? "NOVO"
                    : item.mongo.news === "episode"
                      ? "Novos Episódios"
                      : item.mongo.news === "season"
                        ? "Nova Temporada"
                        : item.mongo.news}
                </Text>
              ) : null}
              <View style={detailStyles.rating}>
                <Ionicons name="star" size={15} color="#f5c542" />
                <Text style={detailStyles.ratingText}>
                  {metadata?.vote_average?.toFixed(1) || "—"}
                </Text>
              </View>
              <Text style={detailStyles.contentRating}>
                {item.mongo.faixa || "L"}
              </Text>
            </View>

            <Text style={detailStyles.description}>{descriptionFor(item)}</Text>

            <View style={detailStyles.actions}>
              <Pressable
                disabled={!firstEpisode || !firstSeason}
                style={({ pressed }) => [
                  detailStyles.playButton,
                  (!firstEpisode || !firstSeason) && detailStyles.disabled,
                  pressed && detailStyles.actionPressed,
                ]}
                onPress={() =>
                  firstEpisode && firstSeason
                    ? playEpisode(firstSeason.s, firstEpisode.ep)
                    : undefined
                }
              >
                <Ionicons name="play" size={20} color="#111" />
                <Text style={detailStyles.playText}>Assistir</Text>
              </Pressable>
              <Pressable
                disabled={libraryLoading}
                style={({ pressed }) => [
                  detailStyles.listButton,
                  pressed && detailStyles.actionPressed,
                ]}
                onPress={() => toggle(item)}
              >
                <Ionicons
                  name={onList ? "checkmark" : "add"}
                  size={21}
                  color={colors.white}
                />
                <Text style={detailStyles.listText}>
                  {onList ? "Na minha lista" : "Minha lista"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={detailStyles.contentSection}>
          <SectionHeading title="Episódios" />
          <Text style={detailStyles.controlLabel}>TEMPORADA</Text>
          <FlatList
            key={`seasons:${item.id}`}
            ref={seasonListRef}
            horizontal
            data={seasons}
            keyExtractor={(season) => String(season.s)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={detailStyles.seasonList}
            renderItem={({ item: season }) => {
              const language = seasonLanguage(season.lang);
              const active = season.s === selectedSeason;
              return (
                <Pressable
                  style={[
                    detailStyles.seasonButton,
                    active && detailStyles.seasonButtonActive,
                  ]}
                  onPress={() => setSelectedSeason(season.s)}
                >
                  <Text
                    style={[
                      detailStyles.seasonText,
                      active && detailStyles.seasonTextActive,
                    ]}
                  >
                    Temporada {season.s}
                    {language ? ` · ${language}` : ""}
                  </Text>
                </Pressable>
              );
            }}
          />

          {seasonLoading ? (
            <View style={detailStyles.seasonInlineLoading}>
              <ActivityIndicator color={colors.red} size="small" />
              <Text style={detailStyles.seasonLoadingText}>
                Atualizando informações dos episódios...
              </Text>
            </View>
          ) : null}
        </View>
          </>
        }
        ListFooterComponent={secondaryReady ? (
          <View style={detailStyles.additionalContent}>
          {related.length ? (
            <View style={detailStyles.relatedContainer}>
              <MediaRow title="Você também pode gostar" items={related} />
            </View>
          ) : null}
          {detailsLoading ? (
            <ActivityIndicator
              color={colors.red}
              style={detailStyles.loading}
            />
          ) : error ? (
            <Text style={detailStyles.errorText}>{error}</Text>
          ) : (
            <>
              <PeopleCarousel title="Elenco" people={cast} />
              <PeopleCarousel title="Equipe técnica" people={crew} />
            </>
          )}
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}

function MovieDetails({
  item,
  navigation,
  secondaryReady,
}: {
  item: CatalogMovie;
  navigation: Props["navigation"];
  secondaryReady: boolean;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { relatedIndex } = useCatalog();
  const { details, loading: detailsLoading, error } = useMediaDetails(item);
  const { contains, toggle, loading: libraryLoading } = useLibrary();
  const [progressEntries, setProgressEntries] = useState<WatchedProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(true);
  const [posterImage, setPosterImage] = useState(() =>
    imageFor(item, "poster"),
  );
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const onList = contains(item.id);

  useEffect(() => {
    let active = true;
    const catalogPoster = imageFor(item, "poster");
    const highResolutionPoster = item.tmdb?.poster_path
      ? `${appConfig.imageUrl}/w780${item.tmdb.poster_path}`
      : catalogPoster;
    setPosterImage(catalogPoster);
    if (secondaryReady && highResolutionPoster !== catalogPoster) {
      void Image.prefetch(highResolutionPoster)
        .then(() => active && setPosterImage(highResolutionPoster))
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [item, secondaryReady]);

  useEffect(() => {
    let active = true;
    const loadProgress = () => {
      setProgressLoading(true);
      progressService
        .byContent(item.id)
        .then((entries) => active && setProgressEntries(entries))
        .catch(() => active && setProgressEntries([]))
        .finally(() => active && setProgressLoading(false));
    };
    loadProgress();
    const unsubscribe = progressService.subscribe(loadProgress);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [item.id]);

  useEffect(() => {
    let active = true;
    setTrailerUrl(null);
    trailerService
      .youtubeUrl("movie", item.id)
      .then((url) => active && setTrailerUrl(url))
      .catch(() => active && setTrailerUrl(null));
    return () => {
      active = false;
    };
  }, [item.id]);

  const metadata = useMemo<TmdbMovie | null>(() => {
    const loaded = details?.metadata;
    if (loaded && "title" in loaded) return loaded;
    return item.tmdb;
  }, [details?.metadata, item.tmdb]);
  const cast = secondaryReady
    ? (details?.credits?.cast.slice(0, 16) ?? [])
    : [];
  const crewGroups = useMemo(
    () =>
      secondaryReady ? groupMovieCrew(details?.credits?.crew ?? []) : [],
    [details?.credits?.crew, secondaryReady],
  );
  const related = useMemo(
    () => (secondaryReady ? getRelatedContent(item, relatedIndex) : []),
    [item, relatedIndex, secondaryReady],
  );
  const progress = progressEntries.find(
    (entry) => entry.mediaType === "movie",
  );
  const runtime = metadata?.runtime ?? 0;
  const progressPercentage =
    progress && runtime > 0
      ? Math.min(100, Math.max(0, Math.round((progress.progress / (runtime * 60)) * 100)))
      : 0;
  const hasProgress = progressPercentage > 0 && progressPercentage < 92;
  const playLabel =
    progressPercentage >= 92
      ? "Assistir novamente"
      : hasProgress
        ? "Continuar assistindo"
        : "Começar a assistir";
  const duration = formatMovieDuration(item.mongo.duration, metadata?.runtime);
  const releaseYear = metadata?.release_date?.slice(0, 4);
  const language = seasonLanguage(item.mongo.lang);
  const revenue = formatRevenue(metadata?.revenue);
  const facts = [duration, releaseYear, language].filter(Boolean);
  const genres = metadata?.genres?.length
    ? metadata.genres.map((genre) => genre.name)
    : genresFor(item);
  const description = metadata?.overview || descriptionFor(item);
  const playMovie = () => {
    if (item.kind !== "movie" || !item.mongo.src) return;
    navigationProgressService.run(() =>
      navigation.navigate("Player", {
        source: {
          kind: "movie",
          tmdbId: item.id,
          title: titleFor(item),
          subtitle: item.mongo.subtitle,
          uri: item.mongo.src,
          duration: item.mongo.duration,
          startPosition:
            hasProgress && progress ? Math.max(0, progress.progress) : 0,
        },
      }),
    );
  };

  const openTrailer = () => {
    if (!trailerUrl) return;
    void Linking.openURL(trailerUrl).catch((openError) => {
      if (__DEV__) {
        const message =
          openError instanceof Error ? openError.message : String(openError);
        console.warn(`[FlixNext:Details] Trailer não abriu | ${message}`);
      }
    });
  };

  return (
    <SafeAreaView style={detailStyles.screen} edges={["left", "right"]}>
      <FlatList
        data={
          secondaryReady && !detailsLoading && !error ? crewGroups : []
        }
        keyExtractor={([department]) => department}
        renderItem={({ item: [department, people] }) => (
          <View style={detailStyles.movieCrewRow}>
            <PeopleCarousel
              title={crewDepartmentLabels[department] ?? department}
              people={people.slice(0, 12)}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={4}
        contentContainerStyle={detailStyles.scrollContent}
        ListHeaderComponent={
          <>
        <View
          style={[
            detailStyles.movieHero,
            { minHeight: Math.max(700, height * 0.94) },
          ]}
        >
          <Image
            source={{ uri: posterImage }}
            style={detailStyles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={[
              "rgba(20,20,20,.04)",
              "rgba(20,20,20,.38)",
              "rgba(20,20,20,.9)",
              colors.background,
            ]}
            locations={[0.08, 0.44, 0.72, 0.96]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(0,0,0,.45)", "transparent"]}
            start={{ x: 0, y: 0.45 }}
            end={{ x: 0.8, y: 0.45 }}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            accessibilityLabel="Voltar"
            style={[
              detailStyles.movieBackButton,
              { top: Math.max(insets.top, 12) },
            ]}
            onPress={navigation.goBack}
          >
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </Pressable>
          <View style={detailStyles.movieInformation}>
            <Text style={detailStyles.heroTitle}>{titleFor(item)}</Text>
            {item.mongo.subtitle?.trim() ? (
              <Text style={detailStyles.heroSubtitle}>{item.mongo.subtitle}</Text>
            ) : null}

            {facts.length ? (
              <View style={detailStyles.metadataLine}>
                {facts.map((fact, index) => (
                  <React.Fragment key={fact}>
                    {index ? (
                      <Text style={detailStyles.metadataDot}>•</Text>
                    ) : null}
                    <Text style={detailStyles.metadataText}>{fact}</Text>
                  </React.Fragment>
                ))}
              </View>
            ) : null}

            <View style={detailStyles.genreList}>
              {genres.map((genre) => (
                <View key={genre} style={detailStyles.genreChip}>
                  <Text style={detailStyles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>

            <View style={detailStyles.tmdbInformation}>
              <View style={detailStyles.rating}>
                <Ionicons name="star" size={15} color="#f5c542" />
                <Text style={detailStyles.ratingText}>
                  {metadata?.vote_average?.toFixed(1) || "—"}
                </Text>
              </View>
              <Text style={detailStyles.contentRating}>
                {item.mongo.faixa || "L"}
              </Text>
            </View>

            {revenue ? (
              <Text style={detailStyles.movieFact}>Receita: {revenue}</Text>
            ) : null}

            <Text style={detailStyles.description}>{description}</Text>
            <View style={detailStyles.actions}>
              <Pressable
                style={({ pressed }) => [
                  detailStyles.playButton,
                  detailStyles.moviePlayButton,
                  (!item.mongo.src || progressLoading) && detailStyles.disabled,
                  pressed && detailStyles.actionPressed,
                ]}
                onPress={playMovie}
                disabled={!item.mongo.src || progressLoading}
              >
                <Ionicons
                  name={hasProgress ? "play" : "play-circle"}
                  size={hasProgress ? 21 : 25}
                  color="#111"
                />
                <Text style={detailStyles.playText}>
                  {progressLoading ? "Carregando progresso..." : playLabel}
                </Text>
                {hasProgress ? (
                  <View style={detailStyles.playProgressTrack}>
                    <View
                      style={[
                        detailStyles.playProgressFill,
                        { width: `${progressPercentage}%` },
                      ]}
                    />
                  </View>
                ) : null}
              </Pressable>
              <View style={detailStyles.secondaryActions}>
                <Pressable
                  style={({ pressed }) => [
                    detailStyles.listButton,
                    detailStyles.secondaryAction,
                    pressed && detailStyles.actionPressed,
                  ]}
                  disabled={libraryLoading}
                  onPress={() => toggle(item)}
                >
                  <Ionicons
                    name={onList ? "checkmark" : "add"}
                    size={21}
                    color={colors.white}
                  />
                  <Text style={detailStyles.listText}>
                    {libraryLoading
                      ? "Atualizando..."
                      : onList
                        ? "Na minha lista"
                        : "Minha lista"}
                  </Text>
                </Pressable>
                {trailerUrl ? (
                  <Pressable
                    accessibilityLabel="Assistir ao trailer no YouTube"
                    style={({ pressed }) => [
                      detailStyles.listButton,
                      detailStyles.secondaryAction,
                      pressed && detailStyles.actionPressed,
                    ]}
                    onPress={openTrailer}
                  >
                    <Ionicons
                      name="film-outline"
                      size={20}
                      color={colors.white}
                    />
                    <Text style={detailStyles.listText}>Trailer</Text>
                    <Ionicons
                      name="open-outline"
                      size={13}
                      color="rgba(255,255,255,.5)"
                    />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        </View>
        {secondaryReady ? (
          <View style={detailStyles.additionalContent}>
          {related.length ? (
            <View style={detailStyles.relatedContainer}>
              <MediaRow title="Você também pode gostar" items={related} />
            </View>
          ) : null}
          {detailsLoading ? (
            <ActivityIndicator color={colors.red} style={detailStyles.loading} />
          ) : error ? (
            <Text style={detailStyles.errorText}>{error}</Text>
          ) : (
            <PeopleCarousel title="Elenco" people={cast} />
          )}
          </View>
        ) : null}
          </>
        }
      />
    </SafeAreaView>
  );
}

export default function DetailsScreen(props: Props) {
  const { kind, id } = props.route.params;
  const { catalog } = useCatalog();
  const item =
    kind === "movie"
      ? catalog.movies.find((movie) => movie.id === id)
      : catalog.series.find((series) => series.id === id);
  const detailKey = `${kind}:${id}`;
  const [secondaryReady, setSecondaryReady] = useState(false);

  useLayoutEffect(() => {
    navigationMetricsService.markMounted(detailKey);
    navigationProgressService.complete();
  }, [detailKey]);

  useEffect(() => {
    setSecondaryReady(false);
    const unsubscribe = props.navigation.addListener("transitionEnd", (event) => {
      if (event.data.closing) return;
      setSecondaryReady(true);
      navigationMetricsService.markTransitionEnd(detailKey);
    });
    const safetyTimer = setTimeout(() => {
      setSecondaryReady(true);
      navigationMetricsService.markTransitionEnd(detailKey);
    }, 700);
    return () => {
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [detailKey, props.navigation]);

  if (!item) {
    return (
      <SafeAreaView style={detailStyles.screen}>
        <View style={detailStyles.missingContent}>
          <Text style={detailStyles.errorText}>Conteúdo indisponível.</Text>
          <Pressable style={detailStyles.listButton} onPress={props.navigation.goBack}>
            <Text style={detailStyles.listText}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (item.kind === "series") {
    return (
      <SeriesDetails
        key={`series:${item.id}`}
        item={item}
        navigation={props.navigation}
        secondaryReady={secondaryReady}
      />
    );
  }
  return (
    <MovieDetails
      key={`movie:${item.id}`}
      item={item}
      navigation={props.navigation}
      secondaryReady={secondaryReady}
    />
  );
}

const detailStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 28 },
  missingContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 18,
  },
  seriesHero: {
    position: "relative",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    left: 14,
    zIndex: 5,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,.48)",
  },
  heroInformation: { paddingHorizontal: 16, paddingBottom: 34 },
  heroTitle: {
    color: "#fff",
    fontFamily: "Montserrat_900Black",
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.2,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,.68)",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    marginTop: 4,
  },
  metadataLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
    marginTop: 15,
  },
  metadataText: {
    color: "rgba(255,255,255,.82)",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
  },
  metadataDot: { color: "rgba(255,255,255,.42)", fontSize: 10 },
  genreList: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 11 },
  genreChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.13)",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,.07)",
  },
  genreText: {
    color: "rgba(255,255,255,.78)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
  },
  tmdbInformation: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 11,
    marginTop: 12,
  },
  newsBadge: {
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    borderRadius: 5,
    backgroundColor: colors.red,
  },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: {
    color: colors.white,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
  },
  contentRating: {
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 4,
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.45)",
    borderRadius: 5,
  },
  description: {
    color: "rgba(255,255,255,.68)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 16,
  },
  actions: { gap: 10, marginTop: 20 },
  playButton: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,.96)",
  },
  playText: { color: "#111", fontFamily: "Montserrat_700Bold", fontSize: 14 },
  listButton: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.14)",
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,.08)",
  },
  listText: {
    color: colors.white,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
  },
  actionPressed: { opacity: 0.82, transform: [{ scale: 0.992 }] },
  disabled: { opacity: 0.45 },
  contentSection: { paddingHorizontal: 16, paddingTop: 26, paddingBottom: 8 },
  episodeRow: { paddingHorizontal: 16 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 18,
  },
  sectionMarker: {
    width: 4,
    height: 24,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  sectionTitle: {
    color: "rgba(255,255,255,.95)",
    fontFamily: "Montserrat_700Bold",
    fontSize: 22,
  },
  controlLabel: {
    color: "rgba(255,255,255,.48)",
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 8,
  },
  seasonList: { paddingRight: 16, paddingBottom: 20 },
  seasonButton: {
    minHeight: 43,
    justifyContent: "center",
    paddingHorizontal: 14,
    marginRight: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.12)",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,.06)",
  },
  seasonButtonActive: { borderColor: colors.red, backgroundColor: colors.red },
  seasonText: {
    color: "rgba(255,255,255,.72)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
  },
  seasonTextActive: { color: "#fff", fontFamily: "Montserrat_600SemiBold" },
  seasonInlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 30,
    marginTop: -9,
  },
  seasonLoadingText: {
    color: "rgba(255,255,255,.46)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
  },
  loading: { minHeight: 130, justifyContent: "center" },
  additionalContent: { paddingHorizontal: 16, paddingBottom: 28 },
  movieCrewRow: { paddingHorizontal: 16 },
  relatedContainer: { marginHorizontal: -16, paddingLeft: 16, marginTop: 18 },
  errorText: {
    color: colors.muted,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    marginTop: 24,
  },
  movieHero: {
    position: "relative",
    minHeight: 700,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  movieBackButton: {
    position: "absolute",
    top: 12,
    left: 14,
    zIndex: 5,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,.48)",
  },
  movieInformation: { paddingHorizontal: 16, paddingBottom: 34 },
  movieFact: {
    color: "rgba(255,255,255,.78)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  moviePlayButton: {
    position: "relative",
    overflow: "hidden",
    paddingBottom: 5,
  },
  playProgressTrack: {
    position: "absolute",
    right: 14,
    bottom: 5,
    left: 14,
    height: 3,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,.18)",
  },
  playProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.red,
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryAction: { flex: 1, paddingHorizontal: 10 },
});
