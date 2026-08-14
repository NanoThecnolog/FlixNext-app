import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as screens from "./AppNavigator";
import { RootStackParamList } from "./types";

const HomeStack = createNativeStackNavigator<RootStackParamList>();
const MyListStack = createNativeStackNavigator<RootStackParamList>();
const SearchStack = createNativeStackNavigator<RootStackParamList>();
const ProfileStack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerShown: false,
  animation: "fade" as const,
  freezeOnBlur: true,
};

export function HomeTabStack() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions} initialRouteName="Home">
      <HomeStack.Screen name="Home" component={screens.Home} />
      <HomeStack.Screen name="Details" component={screens.Details} />
    </HomeStack.Navigator>
  );
}

export function MyListTabStack() {
  return (
    <MyListStack.Navigator
      screenOptions={screenOptions}
      initialRouteName="MyList"
    >
      <MyListStack.Screen name="MyList" component={screens.MyList} />
      <MyListStack.Screen name="Details" component={screens.Details} />
    </MyListStack.Navigator>
  );
}

export function SearchTabStack() {
  return (
    <SearchStack.Navigator screenOptions={screenOptions} initialRouteName="Search">
      <SearchStack.Screen name="Search" component={screens.Search} />
      <SearchStack.Screen name="Details" component={screens.Details} />
    </SearchStack.Navigator>
  );
}

export function ProfileTabStack() {
  return (
    <ProfileStack.Navigator
      screenOptions={screenOptions}
      initialRouteName="Profile"
    >
      <ProfileStack.Screen name="Profile" component={screens.Profile} />
      <ProfileStack.Screen name="Details" component={screens.Details} />
    </ProfileStack.Navigator>
  );
}
