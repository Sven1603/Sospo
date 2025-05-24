// src/screens/App/Events/EditEventScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, Alert } from "react-native";
import {
  Text,
  Title,
  ActivityIndicator,
  useTheme,
  MD3Theme,
  Button,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import { supabase } from "../../../lib/supabase";

import { EventFormData, SportType } from "./EventForm/eventForm.types";

// Define Props for this screen
type Props = NativeStackScreenProps<MainAppStackParamList, "EditEventScreen">;

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      alignItems: "center",
      justifyContent: "flex-start", // Changed to flex-start for title at top
      backgroundColor: theme.colors.background,
    },
    centeredLoader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 20,
      textAlign: "center",
    },
    text: {
      fontSize: 16,
      textAlign: "center",
      marginBottom: 10,
    },
    errorText: {
      fontSize: 16,
      textAlign: "center",
      marginBottom: 10,
      color: theme.colors.error,
    },
  });

const EditEventScreen = ({ route, navigation }: Props) => {
  const { eventId, eventName: initialEventNameFromParam } = route.params;
  const theme = useTheme<MD3Theme>();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [formData, setFormData] = useState<EventFormData | null>(null);
  const [availableSportTypes, setAvailableSportTypes] = useState<SportType[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: `Edit: ${initialEventNameFromParam || "Event"}`,
    });

    let isMounted = true;
    const fetchData = async () => {
      if (!eventId) {
        if (isMounted) {
          setError("Event ID is missing.");
          setLoading(false);
          Alert.alert("Error", "No event specified for editing.", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch available sport types (needed for the form later)
        const { data: sportsData, error: sportsError } = await supabase
          .from("sport_types")
          .select("id, name")
          .order("name");

        if (!isMounted) return;
        if (sportsError) throw sportsError;
        if (sportsData) setAvailableSportTypes(sportsData as SportType[]);

        // Fetch the event to edit
        const { data: eventData, error: eventFetchError } = await supabase
          .from("events")
          .select(
            `
            *, 
            event_sport_types ( sport_types (id) ) 
          `
          ) // Fetch all fields and its selected sport type IDs
          .eq("id", eventId)
          .single();

        if (!isMounted) return;
        if (eventFetchError) throw eventFetchError;

        if (eventData) {
          const fe = eventData as any; // Raw fetched event
          const currentSportTypeIds = (fe.event_sport_types || [])
            .map((est: any) => {
              const sportType = est.sport_types;
              if (sportType && !Array.isArray(sportType)) return sportType.id;
              if (Array.isArray(sportType) && sportType.length > 0)
                return sportType[0]?.id;
              return null;
            })
            .filter(Boolean);

          // Populate formData state
          setFormData({
            eventName: fe.name || "",
            description: fe.description || "",
            selectedSportTypeIds: currentSportTypeIds,
            startTime: fe.start_time ? new Date(fe.start_time) : null,
            endTime: fe.end_time ? new Date(fe.end_time) : null,

            // For editing a single instance, we primarily edit its own details.
            // The series_id tells us if it's part of a series, but we don't edit series pattern here.
            // So, isRecurring, recurrencePattern, seriesEndDate might be set based on how you want to handle this.
            // For MVP "edit single instance", these might be non-editable or reflect instance, not series.
            // Let's assume for now these reflect the instance and are not for editing the series pattern.
            isRecurring: !!fe.series_id, // An instance from a series was recurring
            recurrencePattern: "none", // Not directly editable for an instance in MVP
            seriesEndDate: null, // Not directly editable for an instance in MVP

            sportSpecific_distance: String(
              fe.sport_specific_attributes?.distance_km ?? ""
            ),
            sportSpecific_pace_minutes: fe.sport_specific_attributes
              ?.pace_seconds_per_km
              ? String(
                  Math.floor(
                    fe.sport_specific_attributes.pace_seconds_per_km / 60
                  )
                )
              : "",
            sportSpecific_pace_seconds: fe.sport_specific_attributes
              ?.pace_seconds_per_km
              ? String(fe.sport_specific_attributes.pace_seconds_per_km % 60)
              : "",

            locationText: fe.location_text || "",
            latitude: fe.latitude,
            longitude: fe.longitude,
            map_derived_address: fe.map_derived_address || null,
            privacy: fe.privacy || "public",
            maxParticipants:
              fe.max_participants !== null ? String(fe.max_participants) : "",
            coverImageUrl: fe.cover_image_url || "",
          });
          if (isMounted)
            navigation.setOptions({ title: `Edit: ${fe.name || "Event"}` }); // Update title with fetched name
        } else {
          if (isMounted) setError(`Event with ID ${eventId} not found.`);
        }
      } catch (e: any) {
        console.error("Error fetching data for editing event:", e);
        if (isMounted) setError(e.message || "Failed to load event data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [eventId, navigation]);

  if (loading) {
    return (
      <View style={styles.centeredLoader}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{ marginTop: 10 }}>Loading Event Data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredLoader}>
        <Text style={styles.errorText}>{error}</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  if (!formData) {
    return (
      <View style={styles.centeredLoader}>
        <Text>Event data could not be loaded.</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Title style={styles.title}>
        Editing: {formData.eventName || initialEventNameFromParam}
      </Title>
      <Text style={styles.text}>Event ID: {eventId}</Text>
      <Text
        style={{
          marginTop: 20,
          fontStyle: "italic",
          color: theme.colors.outline,
        }}
      >
        (Step 2 Complete: Event data fetched and ready for form pre-fill.)
      </Text>
      <Text style={{ marginTop: 10 }}>
        Selected Sports: {formData.selectedSportTypeIds.join(", ")}
      </Text>
      <Text>Start Time: {formData.startTime?.toLocaleString()}</Text>
      <Text>Location Text: {formData.locationText}</Text>
      {/* More detailed display will come in Step 3 of this EditEventScreen build-out */}
    </View>
  );
};

export default EditEventScreen;
