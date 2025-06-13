// src/screens/App/Events/EventsScreen.tsx
import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, RefreshControl, SectionList } from "react-native";
import { ActivityIndicator, Chip } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import EventListItem from "../../../components/ui/EventListItem";
import { useQuery } from "@tanstack/react-query";
import { fetchUpcomingEvents } from "../../../services/eventService";
import type { ListedEvent } from "../../../types/eventTypes";
import { AppTheme, useAppTheme } from "../../../theme/theme";
import StyledText from "../../../components/ui/StyledText";
import StyledButton from "../../../components/ui/StyledButton";

type EventSection = {
  title: string; // e.g., "Sun 16, March"
  data: ListedEvent[];
};

const formatSectionHeaderDate = (date: Date): string => {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
  });
};

const groupEventsByDay = (events: ListedEvent[]): EventSection[] => {
  if (!events || events.length === 0) return [];

  const grouped = events.reduce((acc: Record<string, ListedEvent[]>, event) => {
    const eventDate = new Date(event.start_time).toDateString();
    if (!acc[eventDate]) {
      acc[eventDate] = [];
    }
    acc[eventDate].push(event);
    return acc;
  }, {});

  return Object.entries(grouped).map(([dateString, data]) => ({
    title: formatSectionHeaderDate(new Date(dateString)),
    data: data,
  }));
};

type EventsScreenNavigationProp =
  NativeStackNavigationProp<MainAppStackParamList>;

const EventsScreen = () => {
  const navigation = useNavigation<EventsScreenNavigationProp>();
  const theme = useAppTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const {
    data: events = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<ListedEvent[], Error>({
    queryKey: ["upcomingEvents"],
    queryFn: fetchUpcomingEvents,
  });

  const onRefresh = useCallback(async () => {
    console.log("[EventsScreen] Pull-to-refresh triggered.");
    await refetch();
  }, [refetch]);

  const sectionedEvents = useMemo(() => groupEventsByDay(events), [events]);

  const renderSportChips = (
    eventSportTypes: ListedEvent["event_sport_types"]
  ) => {
    if (!eventSportTypes || eventSportTypes.length === 0) return null;
    return eventSportTypes.map((est, index) => {
      const sportType = est.sport_types;
      return sportType ? (
        <Chip
          key={sportType.id || `sport-${index}`}
          icon="tag-outline"
          style={styles.chip}
          textStyle={styles.chipText}
        >
          {sportType.name}
        </Chip>
      ) : null;
    });
  };

  const renderEventItem = ({ item }: { item: ListedEvent }) => (
    <EventListItem
      startTime={item.start_time}
      title={item.name}
      organizer="placeholder"
      location={item.location_text}
      participantCount={100}
      eventDetails={{ distance: 100, pace: 100 }}
      privacy={item.privacy}
      onPress={() =>
        navigation.navigate("EventDetailScreen", {
          eventId: item.id,
          eventName: item.name,
        })
      }
    />
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <StyledText>Loading upcoming events...</StyledText>
      </View>
    );
  }

  if (isError && error) {
    return (
      <View style={styles.centered}>
        <StyledText>Error fetching events: {error.message}</StyledText>
        <StyledButton onPress={() => refetch()}>Try Again</StyledButton>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sectionedEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEventItem}
        renderSectionHeader={({ section: { title } }) => (
          <StyledText>{title}</StyledText>
        )}
        stickySectionHeadersEnabled={true}
        ListHeaderComponent={
          <>
            {/* Your filter buttons can go here */}
            <View style={{ flexDirection: "row", paddingHorizontal: 16 }}>
              <StyledButton variant="outline">Type</StyledButton>
              <StyledButton variant="outline" style={{ marginRight: 8 }}>
                Location
              </StyledButton>
              <StyledButton variant="outline" icon="filter-variant">
                More filters
              </StyledButton>
            </View>
          </>
        }
        ListEmptyComponent={
          !isFetching ? (
            <View style={styles.centered}>
              <StyledText variant="titleMedium">
                No upcoming events found.
              </StyledText>
              <StyledText variant="bodyMedium">
                Check back later or create an event!
              </StyledText>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      backgroundColor: theme.colors.background,
      gap: theme.spacing.x_small,
    },
    listHeader: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 10,
      fontSize: 22,
      fontWeight: "bold",
    },
    listContent: { paddingBottom: 16 },
    card: {
      marginHorizontal: 16,
      marginVertical: 8,
      elevation: 2,
      backgroundColor: theme.colors.surfaceVariant,
    },
    cardCover: { height: 150 },
    cardTitle: {
      fontSize: 18,
      fontWeight: "bold",
      lineHeight: 24,
      marginBottom: 6,
    },
    detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    detailText: {
      marginLeft: 8,
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      flexShrink: 1,
    },
    chipContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
    chip: {
      marginRight: 6,
      marginBottom: 6,
      backgroundColor: theme.colors.secondaryContainer,
    },
    chipText: { color: theme.colors.onSecondaryContainer },
    fab: { position: "absolute", margin: 16, right: 0, bottom: 0 },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" }, // Not explicitly used if using centered
    sectionHeader: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      fontSize: 14,
      fontWeight: "bold",
      color: theme.colors.onSurfaceVariant,
      backgroundColor: theme.colors.surface,
    },
  });

export default EventsScreen;
