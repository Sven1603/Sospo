// src/screens/App/Events/EventDetailScreen.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from "react-native";
import {
  Text,
  Title,
  Paragraph,
  Chip,
  Button,
  ActivityIndicator,
  useTheme,
  MD3Theme,
  Divider,
  Caption,
  Avatar,
  IconButton,
  Snackbar,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types"; // Adjust path
import { supabase } from "../../../lib/supabase"; // Adjust path
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

// --- Type Definitions ---
export type SportTypeStub = {
  id: string;
  name: string;
};

export type ProfileStub = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export type EventParticipant = {
  user_id: string;
  status: "attending" | "interested" | "declined" | "waitlisted";
  profiles: ProfileStub | null; // After processing, this will be a single object
};

export type DetailedEventData = {
  id: string;
  name: string;
  description: string | null;
  start_time: string; // ISO string
  end_time: string | null; // ISO string
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  map_derived_address: string | null;
  privacy: "public" | "private" | "controlled";
  club_id: string | null;
  created_by_user_id: string;
  max_participants: number | null;
  cover_image_url: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  recurrence_end_date: string | null; // Date string YYYY-MM-DD
  sport_specific_attributes: Record<string, any> | null; // JSONB
  created_at: string;

  // Joined data (processed to be single objects or clean arrays)
  creator_profile: ProfileStub | null;
  host_club: { id: string; name: string } | null;
  event_sport_types: Array<{ sport_types: SportTypeStub | null }> | null;
  event_participants: EventParticipant[] | null;
};

// --- Props ---
type Props = NativeStackScreenProps<MainAppStackParamList, "EventDetailScreen">;

const EventDetailScreen = ({ route, navigation }: Props) => {
  const { eventId, eventName } = route.params;
  const theme = useTheme<MD3Theme>();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [event, setEvent] = useState<DetailedEventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // For RSVP buttons
  const [error, setError] = useState<string | null>(null);
  const [currentUserAuthId, setCurrentUserAuthId] = useState<string | null>(
    null
  );
  const [currentUserParticipation, setCurrentUserParticipation] =
    useState<EventParticipant | null>(null);
  const [canManageEvent, setCanManageEvent] = useState(false); // For showing settings gear

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const fetchEventDetails = useCallback(
    async (authId: string | null) => {
      setLoading(true);
      setError(null);
      console.log(
        `[EventDetailScreen] Fetching event ${eventId} for user ${authId}`
      );
      try {
        const { data: rawEventData, error: eventError } = await supabase
          .from("events")
          .select(
            `
        *,
        creator_profile:profiles!events_created_by_user_id_fkey (id, username, avatar_url),
        host_club:clubs!events_club_id_fkey (id, name),
        event_sport_types ( sport_types!inner (id, name) ),
        event_participants ( user_id, status, profiles!inner (id, username, avatar_url) )
      `
          )
          .eq("id", eventId)
          .single();

        if (eventError) throw eventError;
        if (!rawEventData) {
          setError("Event not found.");
          setLoading(false);
          return;
        }

        const fe = rawEventData as any;
        // Process to ensure nested related records are single objects if that's the expectation
        const processedCreatorProfile =
          fe.creator_profile && !Array.isArray(fe.creator_profile)
            ? fe.creator_profile
            : null;
        const processedHostClub =
          fe.host_club && !Array.isArray(fe.host_club) ? fe.host_club : null;

        const processedSportTypes = (fe.event_sport_types || [])
          .map((est: any) => ({
            sport_types:
              est.sport_types && !Array.isArray(est.sport_types)
                ? est.sport_types
                : Array.isArray(est.sport_types) && est.sport_types.length > 0
                ? est.sport_types[0]
                : null,
          }))
          .filter((est: any) => est.sport_types !== null);

        const processedParticipants = (fe.event_participants || []).map(
          (p: any) => ({
            user_id: p.user_id,
            status: p.status,
            profiles:
              p.profiles && !Array.isArray(p.profiles)
                ? p.profiles
                : Array.isArray(p.profiles) && p.profiles.length > 0
                ? p.profiles[0]
                : null,
          })
        );

        const detailedEvent: DetailedEventData = {
          id: fe.id,
          name: fe.name,
          description: fe.description,
          start_time: fe.start_time,
          end_time: fe.end_time,
          location_text: fe.location_text,
          latitude: fe.latitude,
          longitude: fe.longitude,
          map_derived_address: fe.map_derived_address,
          privacy: fe.privacy,
          club_id: fe.club_id,
          created_by_user_id: fe.created_by_user_id,
          max_participants: fe.max_participants,
          cover_image_url: fe.cover_image_url,
          is_recurring: fe.is_recurring,
          recurrence_rule: fe.recurrence_rule,
          recurrence_end_date: fe.recurrence_end_date,
          sport_specific_attributes: fe.sport_specific_attributes,
          created_at: fe.created_at,
          creator_profile: processedCreatorProfile,
          host_club: processedHostClub,
          event_sport_types:
            processedSportTypes.length > 0 ? processedSportTypes : null,
          event_participants: processedParticipants,
        };
        setEvent(detailedEvent);

        if (authId && detailedEvent.event_participants) {
          const userParticipation = detailedEvent.event_participants.find(
            (p) => p.user_id === authId
          );
          setCurrentUserParticipation(userParticipation || null);
        } else {
          setCurrentUserParticipation(null);
        }

        // Determine if current user can manage this event
        let canManage = detailedEvent.created_by_user_id === authId;
        if (!canManage && detailedEvent.club_id && authId) {
          // More robust check: Call a DB function or fetch club membership role
          const { data: staffStatus, error: staffError } = await supabase.rpc(
            "is_user_club_staff",
            { p_user_id: authId, p_club_id: detailedEvent.club_id }
          );
          if (staffError)
            console.error("Error checking club staff status:", staffError);
          if (staffStatus) canManage = true;
        }
        setCanManageEvent(canManage);
      } catch (e: any) {
        console.error("Error fetching event details:", e);
        setError(e.message || "Failed to load details.");
        setEvent(null);
      } finally {
        setLoading(false);
      }
    },
    [eventId]
  );

  useFocusEffect(
    useCallback(() => {
      const getAuthAndFetch = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const authId = user?.id || null;
        setCurrentUserAuthId(authId); // Set this first
        await fetchEventDetails(authId); // Then fetch details using it
      };
      getAuthAndFetch();
    }, [fetchEventDetails])
  );

  useLayoutEffect(() => {
    if (event && canManageEvent) {
      // Only show gear icon if user can manage
      navigation.setOptions({
        title: event.name || eventName || "Event Details", // Ensure eventName fallback if event.name is temp null
        headerRight: () => (
          <IconButton
            icon="cog-outline"
            size={26}
            onPress={() =>
              navigation.navigate("EventSettingsScreen", {
                eventId: event.id,
                eventName: event.name || "Event",
                clubId: event.club_id,
                createdByUserId: event.created_by_user_id,
              })
            }
          />
        ),
      });
    } else if (event) {
      // Event loaded, but user cannot manage
      navigation.setOptions({
        title: event.name || eventName || "Event Details",
        headerRight: undefined, // No gear icon
      });
    } else {
      // Initial state or error
      navigation.setOptions({
        title: eventName || "Event Details",
        headerRight: undefined,
      });
    }
  }, [navigation, event, eventName, canManageEvent, theme.colors.onSurface]);

  const handleRsvp = async (
    newStatus: "attending" | "interested" | "declined"
  ) => {
    if (!currentUserAuthId || !event) {
      Alert.alert("Error", "Cannot RSVP: Missing user or event data.");
      return;
    }
    if (newStatus === "attending" && event.max_participants !== null) {
      const attendingCount =
        event.event_participants?.filter((p) => p.status === "attending")
          .length || 0;
      if (
        attendingCount >= event.max_participants &&
        (!currentUserParticipation ||
          currentUserParticipation.status !== "attending")
      ) {
        Alert.alert(
          "Event Full",
          "This event has reached its maximum number of participants."
        );
        return;
      }
    }
    setActionLoading(true);
    setError(null);
    try {
      const { error: rsvpError } = await supabase
        .from("event_participants")
        .upsert(
          {
            event_id: event.id,
            user_id: currentUserAuthId,
            status: newStatus,
            registered_at: new Date().toISOString(),
          },
          { onConflict: "event_id, user_id" }
        );
      if (rsvpError) throw rsvpError;
      setSnackbarMessage(
        `Your RSVP updated to: ${
          newStatus.charAt(0).toUpperCase() + newStatus.slice(1)
        }`
      );
      setSnackbarVisible(true);
      if (currentUserAuthId) fetchEventDetails(currentUserAuthId); // Refresh details
    } catch (e: any) {
      setError(e.message || "Failed to update RSVP.");
      Alert.alert("RSVP Error", e.message || "Could not update your RSVP.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTimeRange = (startIso?: string, endIso?: string | null) => {
    if (!startIso) return { datePart: "Date TBD", timePart: "Time TBD" };
    const startDate = new Date(startIso);
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    let datePart = startDate.toLocaleDateString(undefined, dateOptions);
    let timePart = `${startDate.toLocaleTimeString(undefined, timeOptions)}`;
    if (endIso) {
      const endDate = new Date(endIso);
      if (startDate.toDateString() === endDate.toDateString()) {
        timePart += ` - ${endDate.toLocaleTimeString(undefined, timeOptions)}`;
      } else {
        timePart += ` to ${endDate.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })} ${endDate.toLocaleTimeString(undefined, timeOptions)}`;
      }
    }
    return { datePart, timePart };
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{ marginTop: 10 }}>Loading event...</Text>
      </View>
    );
  }
  if (error || !event) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error, textAlign: "center" }}>
          {error || "Event could not be loaded."}
        </Text>
        <Button
          onPress={() => {
            if (currentUserAuthId) fetchEventDetails(currentUserAuthId);
          }}
        >
          Try Again
        </Button>
      </View>
    );
  }

  const { datePart, timePart } = formatDateTimeRange(
    event.start_time,
    event.end_time
  );
  const attendingParticipants =
    event.event_participants?.filter((p) => p.status === "attending") || [];

  let rsvpActionSection = null;
  if (currentUserAuthId) {
    // Only show RSVP if user is logged in
    if (currentUserParticipation?.status === "attending") {
      rsvpActionSection = (
        <View style={styles.rsvpButtonRow}>
          <Chip
            icon="check-circle"
            style={styles.statusChipCurrent}
            textStyle={styles.statusChipTextCurrent}
          >
            You are Attending
          </Chip>
          <Button
            mode="outlined"
            onPress={() => handleRsvp("declined")}
            style={styles.rsvpButtonSecondary}
            loading={actionLoading}
            disabled={actionLoading}
          >
            Can't Go
          </Button>
        </View>
      );
    } else if (currentUserParticipation?.status === "interested") {
      rsvpActionSection = (
        <View style={styles.rsvpButtonRow}>
          <Button
            mode="contained"
            icon="check"
            onPress={() => handleRsvp("attending")}
            style={styles.rsvpButtonPrimary}
            loading={actionLoading}
            disabled={actionLoading}
          >
            Attend
          </Button>
          <Button
            mode="outlined"
            onPress={() => handleRsvp("declined")}
            style={styles.rsvpButtonSecondary}
            loading={actionLoading}
            disabled={actionLoading}
          >
            Not Interested
          </Button>
        </View>
      );
    } else {
      // Not participating or declined
      rsvpActionSection = (
        <View style={styles.rsvpButtonRow}>
          <Button
            mode="contained"
            icon="check"
            onPress={() => handleRsvp("attending")}
            style={styles.rsvpButtonPrimary}
            loading={actionLoading}
            disabled={actionLoading}
          >
            Attend Event
          </Button>
          <Button
            mode="outlined"
            icon="star-outline"
            onPress={() => handleRsvp("interested")}
            style={styles.rsvpButtonSecondary}
            loading={actionLoading}
            disabled={actionLoading}
          >
            Interested
          </Button>
        </View>
      );
    }
  }

  const openMapLink = () => {
    if (event?.latitude && event?.longitude) {
      const scheme = Platform.select({
        ios: "maps:0,0?q=",
        android: "geo:0,0?q=",
      });
      const latLng = `${event.latitude},${event.longitude}`;
      const label = encodeURIComponent(event.name || "Event Location");
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`,
      });
      if (url) Linking.openURL(url);
    } else if (event?.location_text) {
      const query = encodeURIComponent(event.location_text);
      const url = Platform.select({
        ios: `maps:0,0?q=${query}`,
        android: `geo:0,0?q=${query}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  return (
    <ScrollView style={styles.scrollView}>
      {event.cover_image_url ? (
        <Image
          source={{ uri: event.cover_image_url }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.coverImage,
            styles.placeholderCover,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        />
      )}

      <View style={styles.contentContainer}>
        <View style={styles.headerSection}>
          <Text style={styles.timeText}>{timePart}</Text>
          <Text style={styles.dateText}>{datePart.toUpperCase()}</Text>
          <Title style={styles.eventName}>{event.name}</Title>
          {event.host_club ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("ClubDetail", {
                  clubId: event.host_club!.id,
                })
              }
            >
              <Text style={styles.organizerText}>
                Organised by:{" "}
                <Text
                  style={{ fontWeight: "bold", color: theme.colors.primary }}
                >
                  {event.host_club.name}
                </Text>
              </Text>
            </TouchableOpacity>
          ) : (
            event.creator_profile && (
              <Text style={styles.organizerText}>
                Organised by:{" "}
                <Text style={{ fontWeight: "bold" }}>
                  {event.creator_profile.username || "A user"}
                </Text>
              </Text>
            )
          )}
        </View>

        <View style={styles.metricsGrid}>
          {event.sport_specific_attributes?.distance_km != null && (
            <View style={styles.metricItem}>
              <MaterialCommunityIcons
                name="map-marker-distance"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.metricValue}>
                {event.sport_specific_attributes.distance_km} km
              </Text>
              <Caption style={styles.metricLabel}>Distance</Caption>
            </View>
          )}
          {event.sport_specific_attributes?.pace_seconds_per_km != null && (
            <View style={styles.metricItem}>
              <MaterialCommunityIcons
                name="speedometer"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.metricValue}>
                {Math.floor(
                  event.sport_specific_attributes.pace_seconds_per_km / 60
                )}
                :
                {(event.sport_specific_attributes.pace_seconds_per_km % 60)
                  .toString()
                  .padStart(2, "0")}
              </Text>
              <Caption style={styles.metricLabel}>Pace/km</Caption>
            </View>
          )}
          {event.end_time && (
            <View style={styles.metricItem}>
              <MaterialCommunityIcons
                name="clock-end"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.metricValue}>
                {new Date(event.end_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Caption style={styles.metricLabel}>Ends At</Caption>
            </View>
          )}
          <View style={styles.metricItem}>
            <MaterialCommunityIcons
              name="account-group"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.metricValue}>
              {attendingParticipants.length}
              {event.max_participants !== null
                ? ` / ${event.max_participants}`
                : ""}
            </Text>
            <Caption style={styles.metricLabel}>Attending</Caption>
          </View>
        </View>

        {currentUserAuthId && rsvpActionSection}

        <Divider style={styles.divider} />

        {event.description && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>About this Event</Title>
            <Paragraph style={styles.paragraph}>{event.description}</Paragraph>
          </View>
        )}

        {event.event_sport_types && event.event_sport_types.length > 0 && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Sports</Title>
            <View style={styles.chipContainer}>
              {event.event_sport_types.map((est, index) => {
                const sportTypeData = est.sport_types; // From processed data, this is SportTypeStub | null
                return sportTypeData ? (
                  <Chip
                    key={sportTypeData.id || `sport-${index}`}
                    icon="tag-outline"
                    style={styles.chip}
                  >
                    {sportTypeData.name}
                  </Chip>
                ) : null;
              })}
            </View>
          </View>
        )}

        {(event.map_derived_address ||
          event.location_text ||
          (event.latitude && event.longitude)) && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Location & Meeting Point</Title>
            {event.map_derived_address && (
              <TouchableOpacity onPress={openMapLink}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={22}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.detailValueLarge,
                      {
                        color: theme.colors.primary,
                        textDecorationLine: "underline",
                      },
                    ]}
                  >
                    {event.map_derived_address}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            {event.location_text && (
              <Paragraph style={styles.locationDetailText}>
                <Text style={styles.detailLabel}>Details: </Text>
                {event.location_text}
              </Paragraph>
            )}

            {event.latitude && event.longitude && (
              <View style={styles.mapViewContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE} // Or default
                  style={styles.map}
                  initialRegion={{
                    latitude: event.latitude,
                    longitude: event.longitude,
                    latitudeDelta: 0.01, // Adjust for appropriate zoom
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: event.latitude,
                      longitude: event.longitude,
                    }}
                    title={event.name}
                    description={
                      event.location_text ||
                      event.map_derived_address ||
                      undefined
                    }
                  />
                </MapView>
              </View>
            )}
          </View>
        )}

        {event.is_recurring && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Recurrence</Title>
            <Paragraph style={styles.detailTextItem}>
              <Text style={styles.detailLabel}>This event repeats.</Text>
            </Paragraph>
            {event.recurrence_rule && (
              <Paragraph style={styles.detailTextItem}>
                <Text style={styles.detailLabel}>Pattern: </Text>
                {event.recurrence_rule}
              </Paragraph>
            )}
            {event.recurrence_end_date && (
              <Paragraph style={styles.detailTextItem}>
                <Text style={styles.detailLabel}>Ends on: </Text>
                {formatDate(event.recurrence_end_date)}
              </Paragraph>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Title style={styles.sectionTitle}>
            Who's Going? ({attendingParticipants.length})
          </Title>
          {attendingParticipants.length > 0 ? (
            attendingParticipants.slice(0, 5).map(
              (
                participant // Show first 5 attendees
              ) => (
                <View key={participant.user_id} style={styles.memberItem}>
                  <Avatar.Text
                    size={36}
                    label={
                      participant.profiles?.username
                        ?.substring(0, 2)
                        .toUpperCase() || "??"
                    }
                    style={[
                      styles.avatar,
                      { backgroundColor: theme.colors.secondaryContainer },
                    ]}
                    color={theme.colors.onSecondaryContainer}
                  />
                  <Text style={styles.memberName}>
                    {participant.profiles?.username ||
                      `User ${participant.user_id.substring(0, 6)}`}
                  </Text>
                </View>
              )
            )
          ) : (
            <Paragraph>No one is attending yet. Be the first!</Paragraph>
          )}
          {/* TODO: "View all participants" button if many participants */}
        </View>
      </View>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{ label: "OK", onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    scrollView: { flex: 1, backgroundColor: theme.colors.background },
    coverImage: {
      width: "100%",
      height: 220,
      backgroundColor: theme.colors.surfaceVariant,
    },
    placeholderCover: { alignItems: "center", justifyContent: "center" },
    contentContainer: { paddingHorizontal: 16, paddingBottom: 20 },
    headerSection: {
      alignItems: "center",
      marginVertical: 16,
      paddingHorizontal: 10,
    },
    dateText: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      textTransform: "uppercase",
      marginBottom: 2,
      fontWeight: "500",
    },
    timeText: {
      fontSize: 18,
      color: theme.colors.onSurface,
      marginBottom: 8,
      fontWeight: "bold",
    },
    eventName: {
      fontSize: 28,
      fontWeight: "bold",
      textAlign: "center",
      color: theme.colors.onSurface,
      marginBottom: 4,
      lineHeight: 34,
    },
    organizerText: {
      fontSize: 15,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 16,
      textAlign: "center",
    },

    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-around",
      alignItems: "flex-start",
      marginBottom: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.elevation.level1,
      borderRadius: theme.roundness * 2,
      paddingHorizontal: 5,
    },
    metricItem: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: 80,
      paddingVertical: 8,
      paddingHorizontal: 5,
      margin: 4,
    },
    metricValue: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.onSurface,
      textAlign: "center",
    },
    metricLabel: {
      fontSize: 12,
      color: theme.colors.onSurfaceDisabled,
      textAlign: "center",
      marginTop: 2,
    },

    primaryActionContainer: {
      marginVertical: 16,
      paddingHorizontal: 10,
      alignItems: "stretch",
    },
    rsvpButtonRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
    },
    rsvpButtonPrimary: { flex: 1, marginHorizontal: 4 },
    rsvpButtonSecondary: { flex: 1, marginHorizontal: 4 },
    statusChipCurrent: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.colors.tertiaryContainer,
    },
    statusChipTextCurrent: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.onTertiaryContainer,
    },

    section: {
      marginBottom: 20,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 12,
      color: theme.colors.onSurface,
    },
    paragraph: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 8,
    },
    detailTextItem: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    detailLabel: { fontWeight: "bold" }, // For inline labels within Paragraphs/Text
    detailRow: {
      flexDirection: "row",
      alignItems: "center", // Vertically align icon and text
      marginBottom: 8, // Spacing below each detail row
    },
    detailValue: {
      // This was the original one I had for general details in cards
      marginLeft: 10,
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      flexShrink: 1, // Allow text to shrink if container is small
    },
    detailValueLarge: {
      // <<< ADD THIS (specifically for location or more prominent details)
      marginLeft: 10,
      fontSize: 17, // Slightly larger
      color: theme.colors.onSurfaceVariant, // Or theme.colors.primary if it's a link as in the example
      flexShrink: 1,
      // textDecorationLine: 'underline', // Add this if it should always be underlined, or handle conditionally
    },

    chipContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
    chip: {
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: theme.colors.secondaryContainer,
    },

    memberItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      paddingVertical: 4,
    },
    avatar: { marginRight: 12 },
    memberName: { fontSize: 16, color: theme.colors.onSurfaceVariant },

    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    divider: {
      marginVertical: 20,
      backgroundColor: theme.colors.outlineVariant,
    },
    mapViewContainer: {
      height: 200, // Adjust as needed
      width: "100%",
      marginVertical: 10,
      borderRadius: theme.roundness,
      overflow: "hidden", // Important for borderRadius on MapView
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    map: {
      ...StyleSheet.absoluteFillObject, // Makes map fill its container
    },
    locationDetailText: {
      // For the optional locationText (additional details)
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
      marginLeft: 32, // Indent if under map marker icon
    },
  });

export default EventDetailScreen;
