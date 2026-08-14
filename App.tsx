import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProviders } from "./src/contexts/AppProviders";
import RootNavigator from "./src/navigation/RootNavigator";
import * as NavigationBar from "expo-navigation-bar";
import { useFonts } from "expo-font";
import { Montserrat_400Regular } from "@expo-google-fonts/montserrat/400Regular";
import { Montserrat_600SemiBold } from "@expo-google-fonts/montserrat/600SemiBold";
import { Montserrat_700Bold } from "@expo-google-fonts/montserrat/700Bold";
import { Montserrat_900Black } from "@expo-google-fonts/montserrat/900Black";
import { ActivityIndicator, View } from "react-native";
import { NavigationProgress } from "./src/components/NavigationProgress";
import { enableFreeze } from "react-native-screens";

enableFreeze(true);

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_900Black,
  });

  useEffect(() => {
    //NavigationBar.setBackgroundColorAsync("#141414");
    NavigationBar.setButtonStyleAsync("dark");
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#141414",
        }}
      >
        <ActivityIndicator color="#d42c2c" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProviders>
        <View style={{ flex: 1 }}>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
          <NavigationProgress />
        </View>
      </AppProviders>
    </SafeAreaProvider>
  );
}
