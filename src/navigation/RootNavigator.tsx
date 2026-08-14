import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList, AuthStackParamList } from "./types";
import * as screens from "./AppNavigator";
import MainTabs from "./MainTabs";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../theme";
const Main = createNativeStackNavigator<RootStackParamList>();
const Auth = createNativeStackNavigator<AuthStackParamList>();
export default function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={colors.red} />
        <Text style={{ color: colors.muted, marginTop: 12 }}>
          Verificando sessão...
        </Text>
      </View>
    );
  if (!user)
    return (
      <Auth.Navigator screenOptions={{ headerShown: false }}>
        <Auth.Screen name="Login" component={screens.Login} />
      </Auth.Navigator>
    );
  return (
    <Main.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
      <Main.Screen name="MainTabs" component={MainTabs} />
      <Main.Screen name="Player" component={screens.Player} />
    </Main.Navigator>
  );
}
