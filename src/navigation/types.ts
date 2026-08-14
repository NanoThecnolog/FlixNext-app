import { CatalogItem, PlaybackSource } from "../domain/content";
export type RootStackParamList = {
  MainTabs: undefined;
  Home: undefined;
  Explore: undefined;
  MyList: undefined;
  Search: undefined;
  Profile: undefined;
  Details: { kind: CatalogItem["kind"]; id: number };
  Player: { source: PlaybackSource };
};
export type AuthStackParamList = { Login: undefined };
export type MainTabParamList = {
  Início: undefined;
  "Minha Lista": undefined;
  Buscar: undefined;
  Perfil: undefined;
};
