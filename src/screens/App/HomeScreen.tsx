// src/screens/App/Home/HomeScreen.tsx
import React, { useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../navigation/types";

import { fetchUpcomingEvents as fetchDiscoverEvents } from "../../services/eventService";
import { fetchVisibleClubs } from "../../services/clubService";
import { supabase } from "../../lib/supabase";
import EventCard from "../../components/ui/EventCard";
import ClubCard from "../../components/ui/ClubCard";
import { AppTheme, useAppTheme } from "../../theme/theme";
import HorizontalListSection from "../../components/ui/HorizontalListSection";

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
    </ScrollView>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
