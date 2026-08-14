import React from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MediaCard from "../components/MediaCard";
import { useCatalog } from "../contexts/CatalogContext";
import { colors, styles } from "../theme";
import { mediaKey } from "../utils/contentSelectors";

export default function ExploreScreen() {
  const { catalog, loading } = useCatalog();
  return (
    <SafeAreaView style={styles.screen}>
      <View style={{ padding: 20, flex: 1 }}>
        <Text style={styles.eyebrow}>EXPLORE A FLIXNEXT</Text>
        <Text style={pageTitle}>Explorar</Text>
        {loading ? (
          <ActivityIndicator color={colors.red} />
        ) : (
          <FlatList
            data={catalog.all}
            renderItem={({ item }) => <MediaCard item={item} />}
            keyExtractor={mediaKey}
            numColumns={2}
            columnWrapperStyle={{ gap: 14 }}
            contentContainerStyle={{ gap: 23, paddingBottom: 35 }}
            ListHeaderComponent={
              <View>
                <Text style={styles.title}>
                  Filmes · {catalog.movies.length}
                </Text>
                <Text style={{ color: colors.muted, marginBottom: 18 }}>
                  Séries · {catalog.series.length}
                </Text>
              </View>
            }
          />
        )}
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
