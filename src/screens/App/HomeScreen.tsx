// src/screens/App/Home/HomeScreen.tsx
import React, { JSX, useEffect } from "react";
import { View, StyleSheet, ScrollView, FlatList } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../navigation/types";

import { fetchUpcomingEvents as fetchDiscoverEvents } from "../../services/eventService";
import { fetchVisibleClubs } from "../../services/clubService";
import { supabase } from "../../lib/supabase";
import { ListedClub } from "../../types/clubTypes";
import { ListedEvent } from "../../types/eventTypes";
import EventCard from "../../components/ui/EventCard";
import StyledText from "../../components/ui/StyledText";
import StyledButton from "../../components/ui/StyledButton";
import ClubCard from "../../components/ui/ClubCard";
import { AppTheme, useAppTheme } from "../../theme/theme";

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

  const renderSection = <T,>(
    title: string,
    data: T[] | undefined,
    isLoading: boolean,
    isError: boolean,
    error: Error | null,
    renderItem: ({ item }: { item: T }) => JSX.Element,
    onSeeAllPress?: () => void,
    emptyMessage: string = "Nothing here yet."
  ) => {
    if (isLoading)
      return (
        <View>
          <ActivityIndicator style={{ marginTop: 20 }} />
        </View>
      );
    if (isError)
      return (
        <View>
          <StyledText style={styles.errorText}>
            Error loading {title.toLowerCase()}: {error?.message}
          </StyledText>
        </View>
      );
    if (!data || data.length === 0)
      return (
        <View>
          <View style={styles.sectionHeader}>
            <StyledText variant="titleMedium">{title}</StyledText>
          </View>
          <StyledText variant="bodyMedium">{emptyMessage}</StyledText>
        </View>
      );

    return (
      <View>
        <View style={styles.sectionHeader}>
          <StyledText variant="titleMedium">{title}</StyledText>
          {onSeeAllPress && (
            <StyledButton variant="link" size="small" onPress={onSeeAllPress}>
              See All
            </StyledButton>
          )}
        </View>
        <FlatList
          data={data.slice(0, 5)} // Show first 5 items for example
          renderItem={renderItem}
          keyExtractor={(item: any) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
        />
      </View>
    );
  };

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
      {renderSection(
        "Discover clubs",
        clubs,
        isLoadingClubs,
        isClubsError,
        clubsError,
        ({ item }) => (
          <ClubCard club={item as ListedClub} />
        ),
        () => navigation.navigate("AppTabs", { screen: "Clubs" }),
        "You haven't joined any clubs yet. Go explore!"
      )}

      {renderSection(
        "Upcoming events",
        discoverEvents,
        isLoadingDiscoverEvents,
        isDiscoverEventsError,
        discoverEventsError,
        ({ item }) => (
          <EventCard event={item as ListedEvent} />
        ),
        () => navigation.navigate("AppTabs", { screen: "Events" }),
        "No public events found right now."
      )}
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
