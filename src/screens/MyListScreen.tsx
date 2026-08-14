import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  NavigationProp,
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCatalog } from "../contexts/CatalogContext";
import { useLibrary } from "../contexts/LibraryContext";
import { CatalogItem } from "../domain/content";
import {
  MainTabParamList,
  RootStackParamList,
} from "../navigation/types";
import { navigationProgressService } from "../services/NavigationProgressService";
import {
  navigateToDetails,
  prefetchDetails,
} from "../navigation/detailsNavigation";
import { colors } from "../theme";
import {
  imageFor,
  mediaKey,
  titleFor,
} from "../utils/contentSelectors";

interface SavedSection {
  key: "movies" | "series";
  title: string;
  countLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  data: CatalogItem[][];
}

const rowsOfTwo = (items: CatalogItem[]) => {
  const rows: CatalogItem[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }
  return rows;
};

function SavedCard({ item, width }: { item: CatalogItem; width: number }) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${titleFor(item)}`}
      style={({ pressed }) => [
        listStyles.card,
        { width },
        pressed && listStyles.pressed,
      ]}
      onPressIn={() => prefetchDetails(item)}
      onPress={() => navigateToDetails(navigation, item)}
    >
      <View style={[listStyles.posterContainer, { height: width * 1.45 }]}>
        <Image
          source={{ uri: imageFor(item, "poster") }}
          resizeMode="cover"
          fadeDuration={0}
          style={listStyles.poster}
        />
      </View>
      <Text style={listStyles.cardTitle} numberOfLines={1}>
        {titleFor(item)}
      </Text>
      <Text style={listStyles.cardMetadata} numberOfLines={1}>
        {item.kind === "movie" ? "Filme" : "Série"} · ★{" "}
        {item.tmdb?.vote_average?.toFixed(1) || "—"}
      </Text>
    </Pressable>
  );
}

function ListHero({ total }: { total: number }) {
  return (
    <View style={listStyles.hero}>
      <Text style={listStyles.eyebrow}>SUA SELEÇÃO</Text>
      <Text style={listStyles.pageTitle}>Minha Lista</Text>
      <Text style={listStyles.heroDescription}>
        Todos os filmes e séries que você separou para assistir depois.
      </Text>
      {total > 0 ? (
        <View style={listStyles.summary}>
          <Ionicons name="bookmark" size={17} color={colors.red} />
          <Text style={listStyles.summaryText}>
            {total} {total === 1 ? "título salvo" : "títulos salvos"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function MyListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNavigation = navigation.getParent<
    NavigationProp<MainTabParamList>
  >();
  const { width } = useWindowDimensions();
  const { catalog, loading: catalogLoading } = useCatalog();
  const { entries, initialized, loading, refresh } = useLibrary();
  const [focusRefreshing, setFocusRefreshing] = useState(true);
  const screenLoading =
    catalogLoading || loading || !initialized || focusRefreshing;
  const cardWidth = Math.max(132, (width - 42) / 2);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setFocusRefreshing(true);
      void refresh()
        .catch(() => undefined)
        .finally(() => active && setFocusRefreshing(false));
      return () => {
        active = false;
      };
    }, [refresh]),
  );

  const savedContent = useMemo(() => {
    const savedIds = new Set(entries.map((entry) => Number(entry.tmdbid)));
    return {
      movies: catalog.movies.filter((movie) => savedIds.has(movie.id)),
      series: catalog.series.filter((series) => savedIds.has(series.id)),
    };
  }, [catalog.movies, catalog.series, entries]);

  const total = savedContent.movies.length + savedContent.series.length;
  const sections = useMemo<SavedSection[]>(() => {
    const result: SavedSection[] = [];
    if (savedContent.movies.length) {
      result.push({
        key: "movies",
        title: "Filmes",
        countLabel: `${savedContent.movies.length} ${savedContent.movies.length === 1 ? "filme salvo" : "filmes salvos"}`,
        icon: "film-outline",
        data: rowsOfTwo(savedContent.movies),
      });
    }
    if (savedContent.series.length) {
      result.push({
        key: "series",
        title: "Séries",
        countLabel: `${savedContent.series.length} ${savedContent.series.length === 1 ? "série salva" : "séries salvas"}`,
        icon: "tv-outline",
        data: rowsOfTwo(savedContent.series),
      });
    }
    return result;
  }, [savedContent.movies, savedContent.series]);

  useEffect(() => {
    if (!screenLoading) navigationProgressService.complete();
  }, [screenLoading]);

  const openTab = useCallback(
    (tab: keyof MainTabParamList) => tabNavigation?.navigate(tab),
    [tabNavigation],
  );

  const renderFeedback = () => (
    <ScrollView contentContainerStyle={listStyles.feedbackScroll}>
      <ListHero total={0} />
      <View style={listStyles.feedbackCard}>
        {screenLoading ? (
          <>
            <ActivityIndicator size="large" color={colors.red} />
            <Text style={listStyles.feedbackTitle}>Carregando sua lista</Text>
            <Text style={listStyles.feedbackDescription}>
              Estamos buscando os títulos que você salvou.
            </Text>
          </>
        ) : (
          <>
            <View style={listStyles.emptyIcon}>
              <Ionicons name="bookmark-outline" size={35} color={colors.red} />
            </View>
            <Text style={listStyles.feedbackTitle}>
              Sua lista ainda está vazia
            </Text>
            <Text style={listStyles.feedbackDescription}>
              Ao encontrar um filme ou série interessante, adicione-o à sua
              lista para acessar mais tarde.
            </Text>
            <Pressable
              style={({ pressed }) => [
                listStyles.exploreButton,
                pressed && listStyles.pressed,
              ]}
              onPress={() => openTab("Início")}
            >
              <Text style={listStyles.exploreButtonText}>Explorar catálogo</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={listStyles.screen} edges={["top", "left", "right"]}>
      <LinearGradient
        colors={["rgba(212,44,44,.15)", "rgba(20,20,20,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.35 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {screenLoading || total === 0 ? (
        renderFeedback()
      ) : (
        <SectionList<CatalogItem[], SavedSection>
          sections={sections}
          keyExtractor={(row) => row.map(mediaKey).join("|")}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={() => void refresh().catch(() => undefined)}
          contentContainerStyle={listStyles.listContent}
          ListHeaderComponent={<ListHero total={total} />}
          renderSectionHeader={({ section }) => (
            <View style={listStyles.categoryHeader}>
              <View style={listStyles.categoryIcon}>
                <Ionicons name={section.icon} size={21} color={colors.red} />
              </View>
              <View>
                <Text style={listStyles.categoryTitle}>{section.title}</Text>
                <Text style={listStyles.categoryCount}>{section.countLabel}</Text>
              </View>
            </View>
          )}
          renderItem={({ item: row }) => (
            <View style={listStyles.cardRow}>
              {row.map((item) => (
                <SavedCard key={mediaKey(item)} item={item} width={cardWidth} />
              ))}
            </View>
          )}
          SectionSeparatorComponent={() => <View style={{ height: 30 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const listStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: 16, paddingBottom: 34 },
  feedbackScroll: { paddingHorizontal: 16, paddingBottom: 34 },
  hero: {
    paddingTop: 24,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,.08)",
    marginBottom: 34,
  },
  eyebrow: {
    color: "#f05a5a",
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    letterSpacing: 1.7,
  },
  pageTitle: {
    color: colors.white,
    fontFamily: "Montserrat_900Black",
    fontSize: 39,
    lineHeight: 43,
    letterSpacing: -1.5,
    marginTop: 7,
  },
  heroDescription: {
    maxWidth: 560,
    color: "rgba(255,255,255,.55)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 9,
  },
  summary: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.09)",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,.045)",
  },
  summaryText: {
    color: "rgba(255,255,255,.68)",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  categoryIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212,44,44,.25)",
    borderRadius: 11,
    backgroundColor: "rgba(212,44,44,.1)",
  },
  categoryTitle: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 21,
  },
  categoryCount: {
    color: "rgba(255,255,255,.4)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    marginTop: 3,
  },
  cardRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  card: { minWidth: 0 },
  posterContainer: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 7,
    backgroundColor: colors.surface,
  },
  poster: { width: "100%", height: "100%" },
  cardTitle: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    marginTop: 8,
  },
  cardMetadata: {
    color: "rgba(255,255,255,.45)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    marginTop: 3,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  feedbackCard: {
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 44,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.085)",
    borderRadius: 18,
    backgroundColor: "#181818",
  },
  emptyIcon: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212,44,44,.24)",
    borderRadius: 20,
    backgroundColor: "rgba(212,44,44,.1)",
  },
  feedbackTitle: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 19,
    textAlign: "center",
    marginTop: 19,
  },
  feedbackDescription: {
    maxWidth: 420,
    color: "rgba(255,255,255,.5)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
  },
  exploreButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 24,
    borderRadius: 8,
    backgroundColor: colors.red,
  },
  exploreButtonText: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
  },
});
