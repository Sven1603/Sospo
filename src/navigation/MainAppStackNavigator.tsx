// src/navigation/MainAppStackNavigator.tsx
import React from "react";
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import {
  getFocusedRouteNameFromRoute,
  RouteProp,
  Theme,
  NavigationProp,
} from "@react-navigation/native";
import { IconButton } from "react-native-paper";

import AppNavigator from "./AppNavigator";
import ProfileScreen from "../screens/App/ProfileScreen";
import { MainAppStackParamList, AppTabParamList } from "./types";
import CreateClubScreen from "../screens/App/Clubs/CreateClubScreen";
import ClubDetailScreen from "../screens/App/Clubs/ClubDetailScreen";
import ClaimClubScreen from "../screens/App/Clubs/ClaimClubScreen";
import EditClubScreen from "../screens/App/Clubs/EditClubScreen";
import ManageJoinRequestsScreen from "../screens/App/Clubs/ManageJoinRequestsScreen";
import ManageClubMembersScreen from "../screens/App/Clubs/ManageClubMembersScreen";
import ClubSettingsScreen from "../screens/App/Clubs/ClubSettingsScreen";
import TransferAdminScreen from "../screens/App/Clubs/TransferAdminScreen";
import RespondToAdminTransferScreen from "../screens/App/Clubs/RespondToAdminTransferScreen";
import ClubReviewsScreen from "../screens/App/Clubs/ClubReviewsScreen";
import SubmitReviewScreen from "../screens/App/SubmitReviewScreen";
import CreateEventForm from "../screens/App/Events/EventForm/CreateEventForm";
import EventDetailScreen from "../screens/App/Events/EventDetailScreen";
import EventSettingsScreen from "../screens/App/Events/EventSettingsScreen";
import EditEventForm from "../screens/App/Events/EventForm/EditEventForm";

const Stack = createNativeStackNavigator<MainAppStackParamList>();

const getHeaderTitle = (route: RouteProp<MainAppStackParamList, "AppTabs">) => {
  const routeName = getFocusedRouteNameFromRoute(route) ?? "Home";
  switch (routeName as keyof AppTabParamList) {
    case "Home":
      return "Sospo Home";
    case "Clubs":
      return "Clubs";
    case "Events":
      return "Events";
    default:
      return "Sospo";
  }
};

const MainAppStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={(props: {
        route: RouteProp<MainAppStackParamList, keyof MainAppStackParamList>;
        navigation: NavigationProp<MainAppStackParamList>;
        theme: Theme;
      }): NativeStackNavigationOptions => ({
        headerStyle: {
          // backgroundColor: '#yourHeaderColor',
        },
        headerTitleStyle: {
          // fontWeight: 'bold',
        },
        headerLeft: () => (
          <IconButton
            icon="account-circle-outline"
            size={28}
            onPress={() => props.navigation.navigate("Profile")}
          />
        ),
      })}
    >
      <Stack.Screen
        name="AppTabs"
        component={AppNavigator}
        options={({ route }) => ({
          title: getHeaderTitle(
            route as RouteProp<MainAppStackParamList, "AppTabs">
          ),
        })}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "My Profile",
          headerLeft: undefined,
        }}
      />
      <Stack.Screen
        name="CreateClub"
        component={CreateClubScreen}
        options={{ title: "Create New Club", headerLeft: undefined }}
      />
      <Stack.Screen name="ClubDetail" component={ClubDetailScreen} />
      <Stack.Screen
        name="ClaimClub"
        component={ClaimClubScreen}
        options={({ route }) => ({
          title: `Claim "${route.params.clubName}"`,
        })}
      />
      <Stack.Screen
        name="EditClub"
        component={EditClubScreen}
        options={{ title: "Edit Club Details", headerLeft: undefined }}
      />
      <Stack.Screen
        name="ManageJoinRequests"
        component={ManageJoinRequestsScreen}
        options={({ route }) => ({
          title: `Join Requests for ${route.params.clubName}`,
          headerLeft: undefined,
        })}
      />
      <Stack.Screen
        name="ManageClubMembers"
        component={ManageClubMembersScreen}
        options={({ route }) => ({
          title: `Manage Members: ${route.params.clubName}`,
          headerLeft: undefined,
        })}
      />
      <Stack.Screen
        name="ClubSettings"
        component={ClubSettingsScreen}
        options={({ route }) => ({
          title: `${route.params.clubName} Settings`,
          headerLeft: undefined,
        })}
      />
      <Stack.Screen
        name="TransferAdminScreen"
        component={TransferAdminScreen}
        options={({ route }) => ({
          title: `Transfer Admin for ${route.params.clubName}`,
        })}
      />
      <Stack.Screen
        name="RespondToAdminTransferScreen"
        component={RespondToAdminTransferScreen}
        options={({ route }) => ({
          title: `Admin Request: ${route.params.clubName}`,
        })}
      />
      <Stack.Screen
        name="ClubReviewsScreen"
        component={ClubReviewsScreen}
        options={({ route }) => ({
          title: `Reviews: ${route.params.clubName}`,
        })}
      />
      <Stack.Screen
        name="SubmitReviewScreen"
        component={SubmitReviewScreen}
        options={({ route }) => ({
          title: route.params.existingReview
            ? `Edit Review`
            : `Review ${route.params.clubName}`,
        })}
      />
      <Stack.Screen
        name="CreateEventScreen"
        component={CreateEventForm}
        options={({ route }) => ({
          title: route.params?.clubName
            ? `New Event for ${route.params.clubName}`
            : "Create New Event",
          headerLeft: undefined,
        })}
      />
      <Stack.Screen
        name="EventDetailScreen"
        component={EventDetailScreen}
        options={({ route }) => ({
          title: route.params?.eventName || "Event Details",
        })}
      />
      <Stack.Screen
        name="EventSettingsScreen"
        component={EventSettingsScreen}
        options={({ route }) => ({
          title: `Settings: ${route.params.eventName}`,
        })}
      />
      <Stack.Screen
        name="EditEventScreen"
        component={EditEventForm}
        options={({ route }) => ({
          title: `Edit: ${route.params?.eventName || "Event"}`,
        })}
      />
    </Stack.Navigator>
  );
};

export default MainAppStackNavigator;
