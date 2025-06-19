// src/screens/App/Home/HomeScreen.tsx
import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { ActivityIndicator, Divider } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../navigation/types";

import {
  fetchUpcomingEvents as fetchDiscoverEvents,
  fetchMyAttendingEvents,
  fetchMyOrganizedEvents,
} from "../../services/eventService";
import {
  fetchMyManagedClubs,
  fetchMyMemberClubs,
  fetchVisibleClubs,
} from "../../services/clubService";
import { supabase } from "../../lib/supabase";
import EventCard from "../../components/ui/EventCard";
import ClubCard from "../../components/ui/ClubCard";
import { AppTheme, useAppTheme } from "../../theme/theme";
import HorizontalListSection from "../../components/ui/HorizontalListSection";
import StyledText from "../../components/ui/StyledText";

type HomeScreenNavigationProp =
  NativeStackNavigationProp<MainAppStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const theme = useAppTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  // TODO: turn this into "myEvents" and show a button which leads to the EventScreen if user is not attending any events yet
  // Fetch "Discover Public Events" (using the existing fetchUpcomingEvents)
  const {
    data: discoverEvents = [],
    isLoading: isLoadingDiscoverEvents,
    isError: isDiscoverEventsError,
    error: discoverEventsError,
    refetch: refetchDiscoverEvents,
  } = useQuery({
    queryKey: ["discoverPublicEvents"],
    queryFn: fetchDiscoverEvents, // Service function for public upcoming events
  });

  // TODO: turn this into "myClubs" and show a button which leads to the ClubScreen if user has not joined any clubs yet
  // Fetch "Clubs"
  const {
    data: clubs = [],
    isLoading: isLoadingClubs,
    isError: isClubsError,
    error: clubsError,
    refetch: refetchVisibleClubs,
  } = useQuery({
    queryKey: ["visibleClubs"],
    queryFn: fetchVisibleClubs,
  });

  const {
    data: managedClubs = [],
    isLoading: isLoadingManagedClubs,
    isError: isManagedClubsError,
    error: managedClubsError,
  } = useQuery({
    queryKey: ["myManagedClubs", currentUserId],
    queryFn: () =>
      currentUserId ? fetchMyManagedClubs(currentUserId) : Promise.resolve([]),
    enabled: !!currentUserId,
  });

  const {
    data: organizedEvents = [],
    isLoading: isLoadingOrganized,
    isError: isOrganizedError,
    error: organizedError,
  } = useQuery({
    queryKey: ["myOrganizedEvents", currentUserId],
    queryFn: () =>
      currentUserId ? fetchMyOrganizedEvents() : Promise.resolve([]),
    enabled: !!currentUserId,
  });

  const {
    data: attendingEvents = [],
    isLoading: isLoadingAttending,
    isError: isAttendingError,
    error: attendingError,
  } = useQuery({
    queryKey: ["myAttendingEvents", currentUserId],
    queryFn: () => (currentUserId ? fetchMyAttendingEvents() : []),
    enabled: !!currentUserId,
  });

  // Filter the "attending" list to exclude any events that are also in the "organized" list
  const attendingOnlyEvents = useMemo(() => {
    // Ensure both arrays are available before processing
    if (!attendingEvents || !organizedEvents) return [];

    // Create a Set of IDs from the events the user is organizing for quick lookup
    const organizedEventIds = new Set(organizedEvents.map((e) => e.id));

    // Filter the attending list, keeping only those whose ID is NOT in the organized set.
    // Also, ensure the event and its id exist before trying to access it.
    return attendingEvents.filter(
      (event) => event && event.id && !organizedEventIds.has(event.id)
    );
  }, [attendingEvents, organizedEvents]);

  const {
    data: memberClubs = [],
    isLoading: isLoadingMemberClubs,
    isError: isMemberClubsError,
    error: memberClubsError,
  } = useQuery({
    queryKey: ["myMemberClubs", currentUserId],
    queryFn: () => (currentUserId ? fetchMyMemberClubs() : []),
    enabled: !!currentUserId,
  });

  if (isLoadingClubs && isLoadingDiscoverEvents) {
    // Very initial loading
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollViewContent}
    >
      {managedClubs.length > 0 && (
        <HorizontalListSection
          title="Clubs You Manage"
          data={managedClubs}
          renderItem={({ item }) => <ClubCard club={item} />}
          keyExtractor={(item) => item.id}
          isLoading={isLoadingManagedClubs}
          isError={isManagedClubsError}
          error={managedClubsError}
          // onSeeAllPress={() => navigation.navigate('AppTabs', { screen: 'Clubs', params: { initialTab: 'Managing' } })} // Future: deep link to a specific tab
        />
      )}

      {organizedEvents.length > 0 && (
        <HorizontalListSection
          title="Events You're Organizing"
          data={organizedEvents}
          renderItem={({ item }) => <EventCard event={item} />}
          keyExtractor={(item) => item.id.toString()}
          isLoading={isLoadingOrganized}
          isError={isOrganizedError}
          error={organizedError}
          // onSeeAllPress={() =>
          //   navigation.navigate("AppTabs", { screen: "Events" })
          // }
        />
      )}

      {(managedClubs.length > 0 || organizedEvents.length > 0) && (
        <Divider style={{ marginVertical: 16, marginHorizontal: 16 }} />
      )}

      <HorizontalListSection
        title="My Upcoming Events"
        data={attendingOnlyEvents}
        renderItem={({ item }) => <EventCard event={item} />}
        keyExtractor={(item) => item.id.toString()}
        isLoading={isLoadingAttending} // Use the specific loading state
        isError={isAttendingError}
        error={attendingError}
        emptyMessage="You don't have any upcoming events which you joined."
      />

      <HorizontalListSection
        title="My Clubs"
        data={memberClubs}
        renderItem={({ item }) => <ClubCard club={item} />}
        keyExtractor={(item) => item.id}
        isLoading={isLoadingMemberClubs}
        isError={isMemberClubsError}
        error={memberClubsError}
        // onSeeAllPress={() =>
        //   navigation.navigate("AppTabs", { screen: "Clubs" })
        // }
        emptyMessage="You haven't joined any clubs as a member yet."
      />

      {!managedClubs.length && !organizedEvents.length && (
        <>
          <HorizontalListSection
            title="Discover Clubs"
            data={clubs.slice(0, 5)}
            renderItem={({ item }) => <ClubCard club={item} />}
            keyExtractor={(item) => item.id}
            isLoading={isLoadingClubs}
            isError={isClubsError}
            error={clubsError}
            onSeeAllPress={() =>
              navigation.navigate("AppTabs", { screen: "Clubs" })
            }
            emptyMessage="You haven't joined any clubs yet."
          />
          <HorizontalListSection
            title="Discover Public Events"
            data={discoverEvents.slice(0, 5)}
            renderItem={({ item }) => <EventCard event={item} />}
            keyExtractor={(item) => item.id}
            isLoading={isLoadingDiscoverEvents}
            isError={isDiscoverEventsError}
            error={discoverEventsError}
            onSeeAllPress={() =>
              navigation.navigate("AppTabs", { screen: "Events" })
            }
            emptyMessage="No public events found right now."
          />
        </>
      )}
    </ScrollView>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingVertical: theme.spacing.small,
    },
    scrollViewContent: { paddingBottom: 20, gap: theme.spacing.large },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      marginBottom: theme.spacing.x_small,
    },
    horizontalListContent: { paddingHorizontal: 16, paddingVertical: 0 },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      backgroundColor: theme.colors.background,
    },
    errorText: {
      color: theme.colors.error,
      marginBottom: 10,
      textAlign: "center",
    },
  });

export default HomeScreen;
