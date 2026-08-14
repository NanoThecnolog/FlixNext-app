import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { MainTabParamList } from "./types";
import { colors } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  HomeTabStack,
  MyListTabStack,
  ProfileTabStack,
  SearchTabStack,
} from "./TabStacks";
import { navigationProgressService } from "../services/NavigationProgressService";

const Tabs = createBottomTabNavigator<MainTabParamList>();
const icons: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Início: "home-outline",
  "Minha Lista": "bookmark-outline",
  Buscar: "search-outline",
  Perfil: "person-circle-outline",
};

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs.Navigator
      screenListeners={({ navigation, route }) => ({
        tabPress: (event) => {
          if (navigation.isFocused()) return;
          event.preventDefault();
          navigationProgressService.run(
            () => navigation.navigate(route.name),
            400,
          );
        },
      })}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: "#8f8f8f",
        tabBarStyle: {
          backgroundColor: "#171717",
          borderTopColor: "#333",
          height: 58 + insets.bottom,
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="Início" component={HomeTabStack} />
      <Tabs.Screen name="Minha Lista" component={MyListTabStack} />
      <Tabs.Screen name="Buscar" component={SearchTabStack} />
      <Tabs.Screen name="Perfil" component={ProfileTabStack} />
    </Tabs.Navigator>
  );
}
