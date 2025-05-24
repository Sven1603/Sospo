import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Text,
  Button,
  ActivityIndicator,
  Snackbar,
  useTheme,
  MD3Theme,
  Title,
  Paragraph,
  Divider,
  List,
  IconButton,
  Caption,
  Card,
  HelperText,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types"; // Adjust path
import { supabase } from "../../../lib/supabase"; // Adjust path
import { EventFormData, SportType } from "../CreateEventForm/eventForm.types"; // Reuse types
import {
  // Import all relevant Zod schemas for validation later
  chooseSportTypesSchema,
  setEventLocationSchema,
  setEventDateTimeSchema,
  eventDetailsSchema,
} from "../CreateEventForm/eventForm.schemas";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// Placeholder for step components that will be used for editing sections
// You would import your actual step components here
// import ChooseSportTypes from '../CreateEventForm/ChooseSportTypes';
// import SetEventLocation from '../CreateEventForm/SetEventLocation';
// import SetEventDateTime from '../CreateEventForm/SetEventDateTime';

type EditingSection =
  | null
  | "basics_sports"
  | "location"
  | "datetime"
  | "overview_details";

type Props = NativeStackScreenProps<MainAppStackParamList, "EditEventScreen">;

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContentContainer: { padding: 16, paddingBottom: 100 }, // Space for save button
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 20,
      color: theme.colors.onSurface,
    },
    sectionCard: {
      marginBottom: 16,
      elevation: 1,
      backgroundColor: theme.colors.surfaceVariant,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.onSurfaceVariant,
    },
    detailLabel: { fontWeight: "bold", color: theme.colors.onSurfaceVariant },
    detailText: { color: theme.colors.onSurface, flexShrink: 1 }, // flexShrink for wrapping
    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 6,
    },
    detailIcon: { marginRight: 8, marginTop: 2 },
    saveButtonContainer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.background,
    },
    editSection: {
      marginTop: 10,
      marginBottom: 20,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: theme.roundness,
    },
  });

const EditEventScreen: React.FC<Props> = ({ route, navigation }) => {
  const { eventId, eventName: initialEventNameFromParam } = route.params;
  const theme = useTheme<MD3Theme>();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [formData, setFormData] = useState<EventFormData | null>(null);
  const [availableSportTypes, setAvailableSportTypes] = useState<SportType[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<EditingSection>(null); // null for overview mode

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [currentUserAuthId, setCurrentUserAuthId] = useState<string | null>(
    null
  );

  // Fetch event data and available sport types
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (!user) {
        Alert.alert("Auth Error", "Not authenticated.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        setLoading(false);
        return;
      }
      setCurrentUserAuthId(user.id);

      try {
        // Fetch available sport types
        const { data: sportsData, error: sportsError } = await supabase
          .from("sport_types")
          .select("id, name")
          .order("name");
        if (!isMounted) return;
        if (sportsError) throw sportsError;
        if (sportsData) setAvailableSportTypes(sportsData as SportType[]);

        // Fetch event to edit
        const { data: eventData, error: eventFetchError } = await supabase
          .from("events")
          .select(`*, event_sport_types ( sport_types (id) )`)
          .eq("id", eventId)
          .single();

        if (!isMounted) return;
        if (eventFetchError) throw eventFetchError;

        if (eventData) {
          const fe = eventData as any;
          navigation.setOptions({ title: `Edit "${fe.name || "Event"}"` });
          const currentSportTypeIds = (fe.event_sport_types || [])
            .map((est: any) => {
              const st = est.sport_types;
              return st && !Array.isArray(st)
                ? st.id
                : Array.isArray(st) && st.length > 0
                ? st[0]?.id
                : null;
            })
            .filter(Boolean);

          setFormData({
            eventName: fe.name || "",
            description: fe.description || "",
            selectedSportTypeIds: currentSportTypeIds,
            startTime: fe.start_time ? new Date(fe.start_time) : new Date(),
            endTime: fe.end_time ? new Date(fe.end_time) : null,
            isRecurring: fe.series_id ? true : false, // Simplified: if it has a series_id, it was part of a recurrence
            recurrencePattern: "none", // Not editing series pattern here for MVP
            seriesEndDate: null, // Not editing series pattern here for MVP
            sportSpecific_distance: String(
              fe.sport_specific_attributes?.distance_km || ""
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
        } else {
          throw new Error("Event not found for editing.");
        }
      } catch (e: any) {
        console.error("Failed to load data for editing:", e);
        setError(e.message || "Could not load event data.");
        Alert.alert("Error", "Failed to load event data. " + e.message, [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [eventId, navigation]);

  const handleChange = useCallback(
    (field: keyof EventFormData, value: any) => {
      setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
      // Clear general error when user starts typing
      if (error) setError(null);
      // We can clear specific field errors if we implement Zod validation on change,
      // but for now, validation happens on "Save".
    },
    [error]
  ); // Removed dependency on 'errors' state to avoid loops if not careful

  const handleSaveChanges = async () => {
    if (!formData || !currentUserAuthId) return;
    setIsSaving(true);
    setError(null);

    // For MVP, let's assume all relevant formData fields are validated by their respective step schemas
    // Here, we'd ideally re-validate the entire formData or changed parts using combined/individual Zod schemas
    // For simplicity, let's assume all fields in formData are now what we want to send.
    // The update_event_and_link_sports function expects all these params.

    let sportSpecificDataToPackage: any = {};
    const distanceVal = parseFloat(
      String(formData.sportSpecific_distance).replace(",", ".")
    );
    if (
      !isNaN(distanceVal) &&
      String(formData.sportSpecific_distance).trim() !== ""
    ) {
      sportSpecificDataToPackage.distance_km = distanceVal;
    }
    const paceMins = formData.sportSpecific_pace_minutes
      ? parseInt(formData.sportSpecific_pace_minutes, 10)
      : 0;
    const paceSecs = formData.sportSpecific_pace_seconds
      ? parseInt(formData.sportSpecific_pace_seconds, 10)
      : 0;
    if (
      !isNaN(paceMins) &&
      !isNaN(paceSecs) &&
      (paceMins > 0 || paceSecs > 0)
    ) {
      // Check against paceMins, paceSecs
      sportSpecificDataToPackage.pace_seconds_per_km = paceMins * 60 + paceSecs;
    }
    const sportSpecificJSON =
      Object.keys(sportSpecificDataToPackage).length > 0
        ? sportSpecificDataToPackage
        : null;

    const finalMaxParticipants =
      formData.maxParticipants &&
      formData.maxParticipants.trim() !== "" &&
      !isNaN(parseInt(formData.maxParticipants))
        ? parseInt(formData.maxParticipants, 10)
        : null;

    try {
      const { error: rpcError } = await supabase.rpc(
        "update_event_and_link_sports",
        {
          p_event_id: eventId,
          p_name: formData.eventName,
          p_description: formData.description || null,
          p_start_time: formData.startTime!.toISOString(),
          p_end_time: formData.endTime?.toISOString() || null,
          p_location_text: formData.locationText || null, // Make sure DB function handles null
          p_latitude: formData.latitude,
          p_longitude: formData.longitude,
          p_map_derived_address: formData.map_derived_address || null,
          p_privacy: formData.privacy,
          p_max_participants: finalMaxParticipants,
          p_cover_image_url: formData.coverImageUrl || null,
          p_new_selected_sport_type_ids: formData.selectedSportTypeIds,
          p_sport_specific_attributes: sportSpecificJSON,
          // Note: Recurrence series fields are NOT updated by this function for single instance edit
        }
      );

      if (rpcError) throw rpcError;

      setSnackbarMessage("Event updated successfully!");
      setSnackbarVisible(true);
      setTimeout(() => navigation.goBack(), 1500); // Go back to previous screen (EventSettings or EventDetail)
    } catch (e: any) {
      console.error("Error updating event:", e);
      setError(e.message || "Failed to update event.");
      Alert.alert("Update Failed", e.message || "Could not update event.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to render individual sections in Overview mode
  const renderOverviewSection = (
    title: string,
    editAction: () => void,
    children: React.ReactNode
  ) => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Title style={styles.sectionTitle}>{title}</Title>
        <IconButton icon="pencil-outline" size={20} onPress={editAction} />
      </View>
      <Card.Content>{children}</Card.Content>
    </Card>
  );

  // Placeholder: Actual editing UI for a section would replace this.
  // For now, clicking "Edit" just sets editingSection, but we're not yet rendering different UIs based on it.
  // This will be the next step: conditionally render actual form components for the selected section.
  const renderEditingUIForSection = (section: EditingSection) => {
    if (!formData) return null;
    // This is where you'd render the specific form component for editing, e.g.:
    // if (section === 'basics_sports') return <ChooseSportTypes formData={...} ... />;
    // if (section === 'location') return <SetEventLocation formData={...} ... />;
    // etc.
    // For now, just show a placeholder:
    return (
      <View style={styles.editSection}>
        <Text>Editing: {section || "N/A"}</Text>
        <Text>(Full form for this section will appear here)</Text>
        <Button
          onPress={() => setEditingSection(null)}
          style={{ marginTop: 10 }}
        >
          Done Editing Section
        </Button>
      </View>
    );
  };

  if (loading || !formData) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading event...</Text>
      </View>
    );
  }
  if (error && !isSaving) {
    // Show persistent error if not in submission process
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error, textAlign: "center" }}>
          {error}
        </Text>
        <Button
          onPress={() => {
            // if (currentUserAuthId) fetchData(currentUserAuthId);
          }}
        >
          Try Again
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Title style={styles.headerTitle}>
          Edit Event: {formData.eventName || initialEventNameFromParam}
        </Title>
        <Caption style={{ textAlign: "center", marginBottom: 15 }}>
          Tap a section's edit icon to modify details.
        </Caption>

        {editingSection ? (
          renderEditingUIForSection(editingSection)
        ) : (
          <>
            {renderOverviewSection(
              "Basics & Sports",
              () => setEditingSection("basics_sports"),
              <>
                <Paragraph>
                  <Text style={styles.detailLabel}>Name: </Text>
                  <Text style={styles.detailText}>{formData.eventName}</Text>
                </Paragraph>
                <Paragraph>
                  <Text style={styles.detailLabel}>Description: </Text>
                  <Text style={styles.detailText}>
                    {formData.description || "-"}
                  </Text>
                </Paragraph>
                <Paragraph>
                  <Text style={styles.detailLabel}>Sports: </Text>
                  <Text style={styles.detailText}>
                    {formData.selectedSportTypeIds
                      .map(
                        (id) =>
                          availableSportTypes.find((s) => s.id === id)?.name
                      )
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </Text>
                </Paragraph>
              </>
            )}

            {renderOverviewSection(
              "Location",
              () => setEditingSection("location"),
              <>
                <Paragraph>
                  <Text style={styles.detailLabel}>Address: </Text>
                  <Text style={styles.detailText}>
                    {formData.map_derived_address ||
                      `${formData.latitude}, ${formData.longitude}` ||
                      "-"}
                  </Text>
                </Paragraph>
                <Paragraph>
                  <Text style={styles.detailLabel}>Details: </Text>
                  <Text style={styles.detailText}>
                    {formData.locationText || "-"}
                  </Text>
                </Paragraph>
              </>
            )}

            {renderOverviewSection(
              "Date, Time & Recurrence",
              () => setEditingSection("datetime"),
              <>
                <Paragraph>
                  <Text style={styles.detailLabel}>Starts: </Text>
                  <Text style={styles.detailText}>
                    {formData.startTime?.toLocaleString() || "-"}
                  </Text>
                </Paragraph>
                {formData.endTime && (
                  <Paragraph>
                    <Text style={styles.detailLabel}>Ends: </Text>
                    <Text style={styles.detailText}>
                      {formData.endTime.toLocaleString()}
                    </Text>
                  </Paragraph>
                )}
                {/* For editing a single instance, recurrence info is mostly display-only from series_id if present */}
                <Paragraph>
                  <Text style={styles.detailLabel}>
                    Recurring Event Instance:{" "}
                  </Text>
                  <Text style={styles.detailText}>
                    {formData.isRecurring
                      ? "Yes (Series info not editable here)"
                      : "No"}
                  </Text>
                </Paragraph>
              </>
            )}

            {renderOverviewSection(
              "Other Details & Settings",
              () => setEditingSection("overview_details"),
              <>
                <Paragraph>
                  <Text style={styles.detailLabel}>Privacy: </Text>
                  <Text style={styles.detailText}>{formData.privacy}</Text>
                </Paragraph>
                <Paragraph>
                  <Text style={styles.detailLabel}>Max Participants: </Text>
                  <Text style={styles.detailText}>
                    {formData.maxParticipants || "Unlimited"}
                  </Text>
                </Paragraph>
                <Paragraph>
                  <Text style={styles.detailLabel}>Cover Image URL: </Text>
                  <Text
                    style={styles.detailText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {formData.coverImageUrl || "-"}
                  </Text>
                </Paragraph>
                <Paragraph>
                  <Text style={styles.detailLabel}>Distance: </Text>
                  <Text style={styles.detailText}>
                    {formData.sportSpecific_distance
                      ? `${formData.sportSpecific_distance} km`
                      : "-"}
                  </Text>
                </Paragraph>
                <Paragraph>
                  <Text style={styles.detailLabel}>Pace: </Text>
                  <Text style={styles.detailText}>
                    {formData.sportSpecific_pace_minutes ||
                    formData.sportSpecific_pace_seconds
                      ? `${formData.sportSpecific_pace_minutes || "0"}m ${
                          formData.sportSpecific_pace_seconds || "0"
                        }s /km`
                      : "-"}
                  </Text>
                </Paragraph>
              </>
            )}
          </>
        )}

        {/* General Error Display */}
        {error && !isSaving && (
          <HelperText
            type="error"
            visible={!!error}
            style={{ textAlign: "center", fontSize: 16, marginTop: 10 }}
          >
            {error}
          </HelperText>
        )}

        {/* Save button is shown when NOT editing a specific section, or could be in header */}
        {!editingSection && (
          <Button
            mode="contained"
            onPress={handleSaveChanges} // Renamed from handleFinalSubmit for clarity
            loading={isSaving}
            disabled={isSaving || loading}
            style={{ marginTop: 30, paddingVertical: 8 }}
            icon="content-save-all-outline"
          >
            Save All Changes
          </Button>
        )}
      </ScrollView>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{ label: "OK", onPress: () => {} }}
      >
        {snackbarMessage}
      </Snackbar>
      {/* DateTimePickerModal instance(s) would be needed if editing date/time in this screen */}
    </KeyboardAvoidingView>
  );
};

export default EditEventScreen;
