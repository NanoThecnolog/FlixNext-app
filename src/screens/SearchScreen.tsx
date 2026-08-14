import React, { useMemo, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MediaCard from "../components/MediaCard";
import { useCatalog } from "../contexts/CatalogContext";
import { colors, styles } from "../theme";
import {
  genresFor,
  mediaKey,
  normalizeGenre,
  titleFor,
} from "../utils/contentSelectors";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const { catalog } = useCatalog();
  const filtered = useMemo(() => {
    const normalizedQuery = normalizeGenre(query);
    if (!normalizedQuery) return [];
    return catalog.all.filter((item) =>
      normalizeGenre(`${titleFor(item)} ${genresFor(item).join(" ")}`).includes(
        normalizedQuery,
      ),
    );
  }, [catalog.all, query]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={styles.eyebrow}>ENCONTRE SEU PRÓXIMO FAVORITO</Text>
        <Text style={pageTitle}>Pesquisar</Text>
        <View style={searchBox}>
          <Ionicons name="search" size={21} color={colors.muted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Filmes, séries, gêneros..."
            placeholderTextColor={colors.muted}
            style={{ flex: 1, color: colors.white, fontSize: 16 }}
          />
        </View>
        <FlatList
          data={filtered}
          renderItem={({ item }) => <MediaCard item={item} />}
          keyExtractor={mediaKey}
          numColumns={2}
          columnWrapperStyle={{ gap: 14 }}
          contentContainerStyle={{ gap: 23, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={{ color: colors.muted }}>
              {query
                ? "Nenhum título encontrado."
                : "Digite para buscar no catálogo."}
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const pageTitle = {
  color: colors.white,
  fontSize: 36,
  fontWeight: "900" as const,
  marginVertical: 12,
};
const searchBox = {
  height: 52,
  borderWidth: 1,
  borderColor: "#555",
  backgroundColor: colors.surface,
  borderRadius: 5,
  paddingHorizontal: 14,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 10,
  marginBottom: 25,
};
