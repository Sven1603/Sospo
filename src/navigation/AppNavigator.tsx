// src/navigation/AppNavigator.tsx
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import HomeScreen from "../screens/App/HomeScreen";
import ClubsScreen from "../screens/App/Clubs/ClubsScreen";
import EventsScreen from "../screens/App/Events/EventsScreen";
// No ProfileScreen import here anymore if it's not a tab

import { AppTabParamList } from "./types";

const Tab = createBottomTabNavigator<AppTabParamList>();

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // <--- Hide default headers for tab screens
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "home";

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Clubs") {
            iconName = focused ? "account-group" : "account-group-outline";
          } else if (route.name === "Events") {
            iconName = focused ? "calendar-check" : "calendar-blank-outline";
          }
          // No Profile icon logic here anymore

          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Clubs" component={ClubsScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      {/* No Profile Tab Screen here anymore */}
    </Tab.Navigator>
  );
};

export default AppNavigator;
