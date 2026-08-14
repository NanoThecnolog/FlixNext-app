import React from "react";
import { FlatList, ListRenderItem, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CatalogItem } from "../../domain/content";
import { colors, styles } from "../../theme";
import { mediaKey } from "../../utils/contentSelectors";
import MediaCard from "../MediaCard";

export const genres = [
  "Ação",
  "Aventura",
  "Romance",
  "Comédia",
  "Terror",
  "Suspense",
  "Fantasia",
  "Ficção científica",
  "Drama",
  "Animação",
  "DC",
  "Marvel",
  //"Crime",
  //"Mistério",
  //"Família",
];

const renderMediaCard: ListRenderItem<CatalogItem> = ({ item }) => (
  <MediaCard item={item} />
);

export const Section = React.memo(function Section({
  title,
  items,
}: {
  title: string;
  items: CatalogItem[];
}) {
  return (
    <View style={{ marginTop: 25 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={styles.title}>{title}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
      <FlatList
        horizontal
        data={items}
        renderItem={renderMediaCard}
        keyExtractor={mediaKey}
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews={false}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={32}
        windowSize={3}
        getItemLayout={(_, index) => ({
          length: 158,
          offset: 158 * index,
          index,
        })}
      />
    </View>
  );
});
