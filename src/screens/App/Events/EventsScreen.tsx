// src/screens/App/Events/EventsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import {
  Text,
  FAB,
  ActivityIndicator,
  Card,
  Title,
  Paragraph,
  Chip,
  useTheme,
  MD3Theme,
  Button,
} from "react-native-paper";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack"; // For typing navigation from useNavigation
import { MainAppStackParamList } from "../../../navigation/types"; // Adjust path
import { supabase } from "../../../lib/supabase"; // Adjust path
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { ListedEvent, SportTypeStub } from "./event.types";

// Type for navigation prop obtained via useNavigation, targeting MainAppStack
type EventsScreenNavigationProp =
  NativeStackNavigationProp<MainAppStackParamList>;

const EventsScreen = () => {
  const navigation = useNavigation<EventsScreenNavigationProp>();
  const theme = useTheme<MD3Theme>();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [events, setEvents] = useState<ListedEvent[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async () => {
    console.log("[EventsScreen] Fetching events...");
    if (!refreshing) setLoadingEvents(true);
    setFetchError(null);
    try {
      const now = new Date().toISOString();
      // The RLS policies will automatically filter which events this user can see.
      // We just ask for upcoming events.
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          id,
          name,
          description,
          start_time,
          location_text,
          cover_image_url,
          club_id,
          privacy,
          event_sport_types ( sport_types ( id, name ) )
        `
        )
        .gte("start_time", now) // Show only upcoming or ongoing events
        .order("start_time", { ascending: true })
        .limit(50); // Keep a limit for performance

      if (error) throw error;

      if (data) {
        console.log(`[EventsScreen] Fetched ${data.length} events.`);
        setEvents(data as any as ListedEvent[]);
      } else {
        setEvents([]);
      }
    } catch (error: any) {
      console.error("[EventsScreen] Error fetching events:", error);
      setFetchError(error.message || "Failed to fetch events.");
    } finally {
      setLoadingEvents(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // fetchEvents() will be called due to refreshing state change if needed,
    // or call it directly:
    // fetchEvents();
  }, []); // refreshing dependency removed from here as fetchEvents handles it

  // Helper to correctly get sport name from potentially nested/array structure
  const getSportNameFromEventSportType = (
    sportTypeData: SportTypeStub | SportTypeStub[] | null
  ): string | null => {
    if (!sportTypeData) return null;
    if (Array.isArray(sportTypeData)) {
      return sportTypeData.length > 0 ? sportTypeData[0].name : null;
    }
    return sportTypeData.name;
  };
  const getSportIdFromEventSportType = (
    sportTypeData: SportTypeStub | SportTypeStub[] | null
  ): string | null => {
    if (!sportTypeData) return null;
    if (Array.isArray(sportTypeData)) {
      return sportTypeData.length > 0 ? sportTypeData[0].id : null;
    }
    return sportTypeData.id;
  };

  const renderEventItem = ({ item }: { item: ListedEvent }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("EventDetailScreen", {
          eventId: item.id,
          eventName: item.name,
        })
      }
    >
      <Card style={styles.card}>
        {item.cover_image_url && (
          <Card.Cover
            source={{ uri: item.cover_image_url }}
            style={styles.cardCover}
          />
        )}
        <Card.Content>
          <Title style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Title>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={styles.detailText}>
              {new Date(item.start_time).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </Text>
          </View>
          {item.location_text && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.location_text}
              </Text>
            </View>
          )}
          <View style={styles.chipContainer}>
            {item.event_sport_types &&
              item.event_sport_types.map((est, index) => {
                const sportName = getSportNameFromEventSportType(
                  est.sport_types
                );
                const sportId = getSportIdFromEventSportType(est.sport_types);
                return sportName ? (
                  <Chip
                    key={sportId || `sport-${index}`}
                    icon="tag-outline"
                    style={styles.chip}
                    textStyle={styles.chipText}
                  >
                    {sportName}
                  </Chip>
                ) : null;
              })}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loadingEvents && events.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Text>Loading upcoming events...</Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error }}>Error: {fetchError}</Text>
        <Button onPress={fetchEvents}>Try Again</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEventItem}
        ListHeaderComponent={
          <Title style={styles.listHeader}>Upcoming Public Events</Title>
        }
        ListEmptyComponent={
          !loadingEvents ? (
            <View style={styles.centered}>
              <Text variant="headlineSmall">No upcoming public events.</Text>
              <Text variant="bodyMedium">
                Check back later or create an event!
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
      {/* FAB for creating events was removed as per your request for this screen
      <FAB
        style={styles.fab}
        icon="plus"
        label="New Event"
        onPress={() => navigation.navigate('CreateEventScreen')}
      />
      */}
    </View>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
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
  });

export default EventsScreen;
