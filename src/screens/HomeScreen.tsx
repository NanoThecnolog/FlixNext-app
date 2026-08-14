import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Platform,
  RefreshControl,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { HeroSection } from "../components/home/HeroSection";
import { ContinueWatchingCarousel } from "../components/home/ContinueWatchingCarousel";
import { LatestEpisodesCarousel } from "../components/home/LatestEpisodesCarousel";
import { Section, genres } from "../components/home/HomeSections";
import { selectFeaturedContent } from "../config/featuredContent";
import { useCatalog } from "../contexts/CatalogContext";
import { CatalogItem } from "../domain/content";
import { colors, styles } from "../theme";
import { normalizeGenre, shuffle } from "../utils/contentSelectors";

interface HomeRow {
  key: string;
  title: string;
  items: CatalogItem[];
}

const byPopularity = (a: CatalogItem, b: CatalogItem) =>
  (b.tmdb?.popularity ?? 0) - (a.tmdb?.popularity ?? 0);

const byRating = (a: CatalogItem, b: CatalogItem) =>
  (b.tmdb?.vote_average ?? 0) - (a.tmdb?.vote_average ?? 0);

const byRecentlyAdded = (a: CatalogItem, b: CatalogItem) =>
  b.mongo.index - a.mongo.index;

function buildHomeRows(items: CatalogItem[]): HomeRow[] {
  const movies = items.filter((item) => item.kind === "movie");
  const series = items.filter((item) => item.kind === "series");
  const genreBuckets = new Map<string, CatalogItem[]>();

  for (const item of items) {
    for (const genre of item.mongo.genero ?? []) {
      const key = normalizeGenre(genre);
      const bucket = genreBuckets.get(key) ?? [];
      if (
        !bucket.some(
          (content) => content.id === item.id && content.kind === item.kind,
        )
      ) {
        bucket.push(item);
      }
      genreBuckets.set(key, bucket);
    }
  }

  const rows: HomeRow[] = [
    {
      key: "top-movies",
      title: "TOP 10 Filmes para assistir",
      items: [...movies].sort(byPopularity).slice(0, 10),
    },
    {
      key: "top-series",
      title: "TOP 10 Séries para assistir",
      items: [...series].sort(byPopularity).slice(0, 10),
    },
    {
      key: "trending",
      title: "Tendências e Populares",
      items: [...items].sort(byRating).slice(0, 20),
    },
    {
      key: "last-movies",
      title: "Últimos filmes adicionados",
      items: [...movies].sort(byRecentlyAdded).slice(0, 20),
    },
    {
      key: "last-series",
      title: "Últimas séries adicionadas",
      items: [...series].sort(byRecentlyAdded).slice(0, 20),
    },
    ...genres.map((genre) => ({
      key: `genre-${normalizeGenre(genre)}`,
      title: genre,
      items: shuffle(genreBuckets.get(normalizeGenre(genre)) ?? []),
    })),
  ];

  return rows.filter((row) => row.items.length > 0);
}

export default function HomeScreen() {
  const { catalog, loading, refreshing, error, refresh } = useCatalog();
  const isFocused = useIsFocused();
  const [heroInViewport, setHeroInViewport] = React.useState(true);
  const items = catalog.all;
  const rows = useMemo(() => buildHomeRows(items), [items]);
  const featuredItems = useMemo(
    () => selectFeaturedContent(catalog),
    [catalog],
  );

  const renderRow = useCallback<ListRenderItem<HomeRow>>(
    ({ item }) => (
      <View style={rowContainer}>
        <Section title={item.title} items={item.items} />
      </View>
    ),
    [],
  );

  const homeHeader = useMemo(
    () => (
      <>
        <HeroSection
          items={featuredItems}
          isActive={isFocused && heroInViewport}
        />
        <ContinueWatchingCarousel items={items} />
        <LatestEpisodesCarousel series={catalog.series} />
      </>
    ),
    [catalog.series, featuredItems, heroInViewport, isFocused, items],
  );

  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const nextVisible =
        event.nativeEvent.contentOffset.y <
        event.nativeEvent.layoutMeasurement.height * 0.8;
      setHeroInViewport((current) =>
        current === nextVisible ? current : nextVisible,
      );
    },
    [],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" />
      {loading ? (
        <View style={centered}>
          <ActivityIndicator color={colors.red} />
          <Text style={{ color: colors.muted, marginTop: 12 }}>
            Carregando catálogo...
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={{ padding: 30 }}>
          <Text style={styles.title}>Catálogo indisponível</Text>
          <Text style={{ color: colors.muted }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          renderItem={renderRow}
          keyExtractor={(row) => row.key}
          ListHeaderComponent={homeHeader}
          contentContainerStyle={{ paddingBottom: 32 }}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          updateCellsBatchingPeriod={32}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.red}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const rowContainer = {
  paddingHorizontal: 18,
};

const centered = {
  flex: 1,
  justifyContent: "center" as const,
  alignItems: "center" as const,
};
