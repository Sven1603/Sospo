// src/navigation/AppNavigator.tsx
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import HomeScreen from "../screens/App/HomeScreen";
import ClubsScreen from "../screens/App/Clubs/ClubsScreen";
import EventsScreen from "../screens/App/Events/EventsScreen";
// No ProfileScreen import here anymore if it's not a tab

import { AppTabParamList } from "./types";
import { useAppTheme } from "../theme/theme";

const Tab = createBottomTabNavigator<AppTabParamList>();

const AppNavigator = () => {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 0,
          elevation: 0,
          paddingHorizontal: 32,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onBackground,
        tabBarLabelStyle: {
          fontFamily: "LeagueSpartan-Regular",
          fontSize: 12,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "home";

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Clubs") {
            iconName = focused ? "account-group" : "account-group-outline";
          } else if (route.name === "Events") {
            iconName = focused ? "calendar-check" : "calendar-blank-outline";
          }

          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Clubs" component={ClubsScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
