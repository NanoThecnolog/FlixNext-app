import { Image } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CatalogItem } from "../domain/content";
import { mediaDetailsService } from "../services/MediaDetailsService";
import { navigationMetricsService } from "../services/NavigationMetricsService";
import { navigationProgressService } from "../services/NavigationProgressService";
import { imageFor } from "../utils/contentSelectors";
import { RootStackParamList } from "./types";

export const prefetchDetails = (item: CatalogItem) => {
  void Image.prefetch(imageFor(item, "poster")).catch(() => undefined);
  void mediaDetailsService.load(item).catch(() => undefined);
  if (item.kind === "series") {
    const sortedSeasons = [...item.mongo.season].sort(
      (first, second) => first.s - second.s,
    );
    const season =
      sortedSeasons.find((candidate) => candidate.s === 1) ?? sortedSeasons[0];
    if (season) {
      void mediaDetailsService
        .loadSeason(item.id, season.s)
        .catch(() => undefined);
    }
  }
};

export const navigateToDetails = (
  navigation: NativeStackNavigationProp<RootStackParamList>,
  item: CatalogItem,
) => {
  const key = `${item.kind}:${item.id}`;
  navigationMetricsService.beginDetails(key);
  navigationProgressService.run(() => {
    navigation.navigate("Details", { kind: item.kind, id: item.id });
    navigationMetricsService.markNavigate(key);
  });
};
