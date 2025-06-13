// src/screens/App/Events/EventDetailScreen.tsx
import React, { useState, useEffect, useLayoutEffect, useMemo } from "react";
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
import { Chip, ActivityIndicator, Divider, Snackbar } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import { supabase } from "../../../lib/supabase";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEventDetails,
  requestToJoinEvent,
  upsertRsvpStatus,
  deleteRsvp,
} from "../../../services/eventService";
import type { DetailedEventData } from "../../../types/eventTypes";
import { AppTheme, useAppTheme } from "../../../theme/theme";
import StyledIconButton from "../../../components/ui/IconButton";
import StyledText from "../../../components/ui/StyledText";
import StyledButton from "../../../components/ui/StyledButton";
import IconText from "../../../components/ui/IconText";
import AvatarList from "../../../components/ui/AvatarList";

type Props = NativeStackScreenProps<MainAppStackParamList, "EventDetailScreen">;

const EventDetailScreen = ({ route, navigation }: Props) => {
  const { eventId, eventName: routeEventName } = route.params;
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const queryClient = useQueryClient();

  const [currentUserAuthId, setCurrentUserAuthId] = useState<string | null>(
    null
  );
  const [canManageEvent, setCanManageEvent] = useState(false);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Get current user ID
  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserAuthId(user?.id || null);
    };
    getUserId();
  }, []);

  // Fetch event details using useQuery
  const {
    data: event,
    isLoading: isLoadingEvent,
    isError: isEventError,
    error: eventFetchError,
    refetch: refetchEventDetails,
  } = useQuery<
    DetailedEventData | null,
    Error,
    DetailedEventData | null,
    [string, string, string | null]
  >({
    queryKey: ["eventDetails", eventId, currentUserAuthId], // Add currentUserAuthId to key
    queryFn: () => fetchEventDetails(eventId, currentUserAuthId), // Pass currentUserAuthId
    enabled: !!eventId && currentUserAuthId !== undefined, // Enable when both are available (currentUserAuthId can be null initially)
  });

  // Determine user's participation and management rights once event data and authId are available
  const currentUserParticipation = useMemo(() => {
    if (!currentUserAuthId || !event || !event.event_participants) return null;
    return (
      event.event_participants.find((p) => p.user_id === currentUserAuthId) ||
      null
    );
  }, [currentUserAuthId, event]);

  useEffect(() => {
    // Effect to set screen title and canManageEvent
    if (event) {
      navigation.setOptions({
        title: event.name || routeEventName || "Event Details",
      });
      let canManage = event.created_by_user_id === currentUserAuthId;
      if (!canManage && event.club_id && currentUserAuthId) {
        // Simple check for now: if it's a club event and user is the creator OR if user is club staff
        // For a more robust club staff check, is_user_club_staff RPC could be called here
        // or fetched as part of user's profile/permissions globally.
        // For now, just creator. Club staff check should be done if navigating to settings.
      }
      setCanManageEvent(canManage);
    } else if (!isLoadingEvent) {
      // If not loading and no event, use initial name
      navigation.setOptions({ title: routeEventName || "Event Details" });
    }
  }, [navigation, event, routeEventName, currentUserAuthId]);

  // useLayoutEffect for settings gear icon (depends on canManageEvent)
  useLayoutEffect(() => {
    if (event && canManageEvent) {
      navigation.setOptions({
        headerRight: () => (
          <StyledIconButton
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
            iconColor={theme.colors.onSurface}
          />
        ),
      });
    } else {
      navigation.setOptions({ headerRight: undefined });
    }
  }, [navigation, event, canManageEvent, theme.colors.onSurface]);

  // Mutation for RSVP
  const rsvpMutation = useMutation({
    mutationFn: upsertRsvpStatus,
    onSuccess: (data, variables) => {
      setSnackbarMessage(
        `Your RSVP updated to: ${
          variables.status.charAt(0).toUpperCase() + variables.status.slice(1)
        }`
      );
      setSnackbarVisible(true);
      queryClient.invalidateQueries({ queryKey: ["eventDetails", eventId] });
    },
    onError: (error: Error) => {
      Alert.alert("RSVP Error", error.message || "Could not update your RSVP.");
    },
  });

  const deleteRsvpMutation = useMutation({
    mutationFn: deleteRsvp, // Uses delete for leaving
    onSuccess: () => {
      setSnackbarMessage(`You are no longer attending.`);
      setSnackbarVisible(true);
      queryClient.invalidateQueries({
        queryKey: ["eventDetails", eventId, currentUserAuthId],
      });
    },
    onError: (error: Error) =>
      Alert.alert("Error Leaving Event", error.message),
  });

  const handleRsvp = (newStatus: "attending" | "interested" | "declined") => {
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
          "This event has reached its maximum participants."
        );
        return;
      }
    }
    rsvpMutation.mutate({
      eventId: event.id,
      userId: currentUserAuthId,
      status: newStatus,
    });
  };

  const handleLeaveEvent = () => {
    if (!currentUserAuthId || !event) return;
    Alert.alert("Leave Event", "Are you sure you want to leave this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          deleteRsvpMutation.mutate({
            eventId: event.id,
            userId: currentUserAuthId!,
          });
        },
      },
    ]);
  };

  const requestToJoinMutation = useMutation({
    mutationFn: requestToJoinEvent,
    onSuccess: () => {
      setSnackbarMessage("Your request to join has been sent!");
      setSnackbarVisible(true);
      // Refetch event details to update pending request status and button UI
      queryClient.invalidateQueries({
        queryKey: ["eventDetails", eventId, currentUserAuthId],
      });
    },
    onError: (error: Error) => {
      Alert.alert(
        "Request Error",
        error.message || "Could not send your request."
      );
    },
  });

  const handleRequestToJoinEvent = () => {
    if (!currentUserAuthId || !event) return;
    requestToJoinMutation.mutate({
      eventId: event.id,
      userId: currentUserAuthId,
    });
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

  // --- Loading and Error States ---
  if (isLoadingEvent) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <StyledText>Loading event...</StyledText>
      </View>
    );
  }
  if (isEventError && eventFetchError) {
    return (
      <View style={styles.centered}>
        <StyledText style={{ color: theme.colors.error, textAlign: "center" }}>
          Error: {eventFetchError.message}
        </StyledText>
        <StyledButton onPress={() => refetchEventDetails()}>
          Try Again
        </StyledButton>
      </View>
    );
  }
  if (!event) {
    return (
      <View style={styles.centered}>
        <StyledText>Event not found.</StyledText>
        <StyledButton onPress={() => refetchEventDetails()}>
          Try Again
        </StyledButton>
      </View>
    );
  }

  // --- Derived data for rendering ---
  const { datePart, timePart } = formatDateTimeRange(
    event.start_time,
    event.end_time
  );
  const attendingParticipants =
    event.event_participants?.filter((p) => p.status === "attending") || [];

  let rsvpActionSection = null;
  if (currentUserAuthId && event) {
    const isCurrentlyAttending =
      currentUserParticipation?.status === "attending";
    const isCurrentlyInterested =
      currentUserParticipation?.status === "interested";

    // isOrganizer includes event creator OR club staff for club events
    const isOrganizer = canManageEvent;

    if (isOrganizer) {
      if (isCurrentlyAttending) {
        rsvpActionSection = (
          <View style={styles.rsvpButtonRow}>
            <Chip icon="account-tie" style={styles.statusChipOrganizing}>
              Organizing & Attending
            </Chip>
            <StyledButton
              variant="outline"
              onPress={handleLeaveEvent}
              loading={rsvpMutation.isPending}
              disabled={rsvpMutation.isPending}
            >
              Can't Go
            </StyledButton>
          </View>
        );
      } else {
        // Organizer not yet attending (e.g., club staff who didn't create it)
        rsvpActionSection = (
          <View style={styles.rsvpButtonRow}>
            <StyledButton
              icon="check"
              onPress={() => handleRsvp("attending")}
              loading={rsvpMutation.isPending}
              disabled={rsvpMutation.isPending}
            >
              Confirm My Attendance
            </StyledButton>
            {/* Optionally, an "Interested" button for organizers */}
            {!isCurrentlyInterested && (
              <StyledButton
                variant="outline"
                icon="star-outline"
                onPress={() => handleRsvp("interested")}
                loading={rsvpMutation.isPending}
                disabled={rsvpMutation.isPending}
              >
                Interested
              </StyledButton>
            )}
          </View>
        );
      }
    } else if (isCurrentlyAttending) {
      // Regular user who is attending
      rsvpActionSection = (
        <View style={styles.rsvpButtonRow}>
          <Chip icon="check-circle" style={styles.statusChipCurrent}>
            You are Attending
          </Chip>
          <StyledButton
            variant="outline"
            icon="account-remove-outline"
            onPress={handleLeaveEvent}
            loading={rsvpMutation.isPending}
            disabled={rsvpMutation.isPending}
          >
            Can't Go
          </StyledButton>
        </View>
      );
    } else if (isCurrentlyInterested) {
      // Regular user who is interested
      rsvpActionSection = (
        <View style={styles.rsvpButtonRow}>
          <StyledButton
            icon="check"
            onPress={() => handleRsvp("attending")}
            loading={rsvpMutation.isPending}
            disabled={rsvpMutation.isPending}
          >
            Attend
          </StyledButton>
          <StyledButton
            variant="secondary"
            onPress={handleLeaveEvent}
            loading={rsvpMutation.isPending}
            disabled={rsvpMutation.isPending}
          >
            Not Interested
          </StyledButton>
        </View>
      );
    } else {
      // Not attending, not interested, and not an organizer (or organizer who hasn't RSVP'd yet)
      if (event.privacy === "public") {
        rsvpActionSection = (
          <View style={styles.rsvpButtonRow}>
            <StyledButton
              icon="check"
              onPress={() => handleRsvp("attending")}
              loading={rsvpMutation.isPending}
              disabled={rsvpMutation.isPending}
            >
              Attend Event
            </StyledButton>
            <StyledButton
              variant="outline"
              icon="star-outline"
              onPress={() => handleRsvp("interested")}
              loading={rsvpMutation.isPending}
              disabled={rsvpMutation.isPending}
            >
              Interested
            </StyledButton>
          </View>
        );
      } else if (event.privacy === "controlled") {
        if (requestToJoinMutation.isPending) {
          // checkingJoinRequestStatus state is from previous step
          rsvpActionSection = (
            <StyledButton loading={true} disabled={true}>
              Checking Status...
            </StyledButton>
          );
        } else if (event.currentUserPendingJoinRequest) {
          // pendingJoinRequest state is from previous step
          rsvpActionSection = (
            <Chip icon="clock-outline" style={styles.statusChipPending}>
              Request Pending
            </Chip>
          );
        } else {
          rsvpActionSection = (
            <StyledButton
              icon="account-plus-outline"
              onPress={handleRequestToJoinEvent}
              loading={rsvpMutation.isPending}
              disabled={rsvpMutation.isPending}
            >
              Request to Join
            </StyledButton>
          );
        }
      } else if (event.privacy === "private") {
        rsvpActionSection = (
          <Chip icon="lock" style={styles.statusChipPrivate}>
            Event is Private / Invite Only
          </Chip>
        );
      }
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
          <StyledText>{timePart}</StyledText>
          <StyledText>{datePart.toUpperCase()}</StyledText>
          <StyledText variant="titleMedium">{event.name}</StyledText>
          {event.host_club_name ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("ClubDetail", {
                  clubId: event.club_id!,
                })
              }
            >
              <StyledText>
                Organised by:{" "}
                <StyledText
                  style={{ fontWeight: "bold", color: theme.colors.primary }}
                >
                  {event.host_club_name}
                </StyledText>
              </StyledText>
            </TouchableOpacity>
          ) : (
            event.creator_profile && (
              <StyledText>
                Organised by:{" "}
                <StyledText style={{ fontWeight: "bold" }}>
                  {event.creator_profile.username || "A user"}
                </StyledText>
              </StyledText>
            )
          )}
        </View>

        <View style={styles.metricsGrid}>
          {event.sport_specific_attributes?.distance_km != null && (
            <IconText
              icon="map-marker-distance"
              label={`${event.sport_specific_attributes?.distance_km} km`}
            />
          )}
          {event.sport_specific_attributes?.pace_seconds_per_km != null && (
            <IconText
              icon="speedometer"
              label={`${Math.floor(
                event.sport_specific_attributes.pace_seconds_per_km / 60
              )}:${(event.sport_specific_attributes.pace_seconds_per_km % 60)
                .toString()
                .padStart(2, "0")} min/km`}
            />
          )}
          {event.end_time && (
            <IconText
              icon="clock-end"
              label={`${new Date(event.end_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })} end time`}
            />
          )}
          <IconText
            icon="account-group"
            label={`${attendingParticipants.length}
              ${
                event.max_participants !== null
                  ? ` / ${event.max_participants}`
                  : ""
              } participants`}
          />
        </View>

        {currentUserAuthId && rsvpActionSection}

        <Divider style={styles.divider} />

        {event.description && (
          <View style={styles.section}>
            <StyledText variant="titleSmall">About this Event</StyledText>
            <StyledText>{event.description}</StyledText>
          </View>
        )}

        {event.event_sport_types && event.event_sport_types.length > 0 && (
          <View style={styles.section}>
            <StyledText variant="titleSmall">Sports</StyledText>
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
            <StyledText variant="titleSmall">
              Location & Meeting Point
            </StyledText>
            {event.map_derived_address && (
              <TouchableOpacity onPress={openMapLink}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={22}
                    color={theme.colors.primary}
                  />
                  <StyledText>{event.map_derived_address}</StyledText>
                </View>
              </TouchableOpacity>
            )}
            {event.location_text && (
              <StyledText>{event.location_text}</StyledText>
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
            <StyledText variant="titleSmall">Recurrence</StyledText>
            <StyledText>This event repeats.</StyledText>
          </View>
        )}

        <View style={styles.section}>
          <StyledText variant="titleSmall">
            Who's Going? ({attendingParticipants.length}
            {event.max_participants !== null
              ? ` / ${event.max_participants}`
              : ""}
            )
          </StyledText>
          {attendingParticipants.length > 0 ? (
            <AvatarList
              profiles={attendingParticipants.map(
                (participant) => participant.profiles
              )}
            />
          ) : (
            <StyledText>
              No one has RSVP'd as 'attending' yet.
              {event.privacy === "public" &&
                (!currentUserParticipation ||
                  currentUserParticipation.status !== "attending") &&
                " Be the first!"}
            </StyledText>
          )}
          {/* TODO: Add a "View all X attendees" button if desired, which could navigate
            to a new screen listing all participants if the list is long. */}
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

const getStyles = (theme: AppTheme) =>
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
    statusChipCurrent: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.colors.tertiaryContainer,
    },

    section: {
      marginBottom: 20,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center", // Vertically align icon and text
      marginBottom: 8, // Spacing below each detail row
    },

    chipContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
    chip: {
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: theme.colors.secondaryContainer,
    },

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
    statusChipOrganizing: {
      alignSelf: "center",
      backgroundColor: theme.colors.tertiaryContainer,
      paddingHorizontal: 16,
    },
    statusChipPending: {
      alignSelf: "center",
      backgroundColor: theme.colors.surfaceVariant,
      paddingHorizontal: 16,
    },
    statusChipPrivate: {
      alignSelf: "center",
      backgroundColor: theme.colors.surfaceDisabled,
      paddingHorizontal: 16,
    },
  });

export default EventDetailScreen;
