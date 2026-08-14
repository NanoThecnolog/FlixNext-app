import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CatalogItem } from "../domain/content";
import { RootStackParamList } from "../navigation/types";
import {
  navigateToDetails,
  prefetchDetails,
} from "../navigation/detailsNavigation";
import { colors } from "../theme";
import { imageFor, titleFor } from "../utils/contentSelectors";

function MediaCard({ item }: { item: CatalogItem }) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Pressable
      style={{ width: 145, height: 265, marginRight: 13 }}
      onPressIn={() => prefetchDetails(item)}
      onPress={() => navigateToDetails(navigation, item)}
    >
      <View
        style={{
          width: 145,
          height: 210,
          backgroundColor: colors.surface,
          borderRadius: 5,
          overflow: "hidden",
        }}
      >
        <Image
          source={{ uri: imageFor(item) }}
          resizeMode="cover"
          fadeDuration={0}
          style={{ width: 145, height: 210 }}
        />
      </View>
      <Text
        style={{
          color: colors.white,
          fontSize: 14,
          fontWeight: "700",
          marginTop: 9,
        }}
        numberOfLines={1}
      >
        {titleFor(item)}
      </Text>
      <Text style={{ color: "#888", fontSize: 12, marginTop: 1 }}>
        {item.kind === "series" ? "Série" : "Filme"} · ★{" "}
        {item.tmdb?.vote_average?.toFixed(1) || "—"}
      </Text>
    </Pressable>
  );
}

export default React.memo(MediaCard);
