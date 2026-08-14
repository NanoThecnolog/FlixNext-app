import React from "react";
import { FlatList, Text, View } from "react-native";
import { CatalogItem } from "../domain/content";
import { styles } from "../theme";
import { mediaKey } from "../utils/contentSelectors";
import MediaCard from "./MediaCard";

export default function MediaRow({
  title,
  items,
}: {
  title: string;
  items: CatalogItem[];
}) {
  return (
    <View style={{ marginTop: 27 }}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={items}
        renderItem={({ item }) => <MediaCard item={item} />}
        keyExtractor={mediaKey}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}
