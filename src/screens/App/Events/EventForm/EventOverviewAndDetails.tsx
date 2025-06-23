// src/screens/App/CreateEventForm/EventOverviewAndDetails.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import {
  Text,
  Button,
  Title,
  Paragraph,
  Divider,
  Caption,
  Card,
  TextInput,
  HelperText,
  SegmentedButtons,
  MD3Theme,
} from "react-native-paper";
import { EventFormData, SportType } from "./eventForm.types";
import PrivacySelector from "../../../../components/form/PrivacySelector";

interface EventOverviewAndDetailsProps {
  formData: EventFormData;
  availableSportTypes: SportType[];
  clubId?: string | null;
  handleChange: (field: keyof EventFormData, value: any) => void;
  goToStep: (step: number) => void;
  handleFinalSubmit: () => Promise<void>;
  isSubmitting: boolean;
  isEditMode?: boolean;
  theme: MD3Theme;
  errors: Partial<
    Record<keyof EventFormData | "submit", string | null | undefined>
  >; // Include 'submit' for final submit errors
}

const EventOverviewAndDetails: React.FC<EventOverviewAndDetailsProps> = ({
  formData,
  availableSportTypes,
  clubId,
  handleChange,
  goToStep,
  handleFinalSubmit,
  isSubmitting,
  isEditMode,
  theme,
  errors,
}) => {
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const getSportNamesDisplay = () =>
    formData.selectedSportTypeIds
      .map((id) => availableSportTypes.find((st) => st.id === id)?.name)
      .filter(Boolean)
      .join(", ") || "Not specified";

  const renderReviewSection = (
    title: string,
    stepNumber: number,
    content: React.ReactNode
  ) => (
    <Card style={styles.reviewSectionCard} onPress={() => goToStep(stepNumber)}>
      <View style={styles.sectionHeader}>
        <Title style={styles.sectionTitle}>{title}</Title>
        <Button
          mode="text"
          onPress={() => goToStep(stepNumber)}
          labelStyle={styles.editButtonLabel}
          compact
        >
          Edit
        </Button>
      </View>
      <Card.Content style={styles.previewSectionContent}>
        {content}
      </Card.Content>
    </Card>
  );

  // Determine which sport-specific fields to show based on Step 1 selection
  const selectedSportNamesLower = formData.selectedSportTypeIds
    .map((id) =>
      availableSportTypes.find((st) => st.id === id)?.name.toLowerCase()
    )
    .filter(Boolean);
  const showRunCycleDistanceAttr =
    selectedSportNamesLower.length === 1 &&
    (selectedSportNamesLower.includes("run") ||
      selectedSportNamesLower.includes("cycle"));
  const showRunPaceAttr =
    selectedSportNamesLower.length === 1 &&
    selectedSportNamesLower.includes("run");

  const privacyOptions = [
    { label: "Public", value: "public" },
    { label: "Controlled", value: "controlled", icon: "account-eye-outline" },
    { label: "Invite Only", value: "private" },
  ];

  return (
    <View>
      <Title style={styles.stepTitle}>
        {isEditMode
          ? "Step 4: Review & Update Details"
          : "Step 4: Overview & Final Details"}
      </Title>
      <Caption style={{ textAlign: "center", marginBottom: 15 }}>
        Review your event. Tap a section to edit.
      </Caption>

      {/* --- Review Sections --- */}
      {renderReviewSection(
        "Sports",
        1,
        <Paragraph>
          <Text style={styles.detailText}>{getSportNamesDisplay()}</Text>
        </Paragraph>
      )}
      {renderReviewSection(
        "Location",
        2,
        <>
          <Paragraph>
            <Text style={styles.detailLabel}>Main Location: </Text>
            <Text style={styles.detailText}>
              {formData.map_derived_address ||
                (formData.latitude && formData.longitude
                  ? `Coords: ${formData.latitude.toFixed(
                      4
                    )}, ${formData.longitude.toFixed(4)}`
                  : "Not set")}
            </Text>
          </Paragraph>
          {formData.locationText && (
            <Paragraph>
              <Text style={styles.detailLabel}>Details/Landmark: </Text>
              <Text style={styles.detailText}>{formData.locationText}</Text>
            </Paragraph>
          )}
        </>
      )}
      {renderReviewSection(
        "Date, Time & Recurrence",
        3,
        <>
          <Paragraph>
            <Text style={styles.detailLabel}>Starts: </Text>
            <Text style={styles.detailText}>
              {formData.startTime?.toLocaleString() || "Not set"}
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
          <Paragraph>
            <Text style={styles.detailLabel}>Recurring: </Text>
            <Text style={styles.detailText}>
              {formData.isRecurring
                ? `Yes, ${formData.recurrencePattern}`
                : "No"}
            </Text>
          </Paragraph>
          {formData.isRecurring && formData.seriesEndDate && (
            <Paragraph>
              <Text style={styles.detailLabel}>Series Ends: </Text>
              <Text style={styles.detailText}>
                {formData.seriesEndDate.toLocaleDateString()}
              </Text>
            </Paragraph>
          )}
        </>
      )}

      <Divider style={{ marginVertical: 20 }} />
      <Title style={styles.subHeader}>Event Details & Settings</Title>

      {/* --- Input Fields for this Step --- */}
      <TextInput
        label="Event Name*"
        value={formData.eventName}
        onChangeText={(text) => handleChange("eventName", text)}
        mode="outlined"
        style={styles.input}
        error={!!errors.eventName}
      />
      {errors.eventName && (
        <HelperText type="error">{errors.eventName}</HelperText>
      )}

      <TextInput
        label="Description (optional)"
        value={formData.description}
        onChangeText={(text) => handleChange("description", text)}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
        error={!!errors.description}
      />
      {errors.description && (
        <HelperText type="error">{errors.description}</HelperText>
      )}

      {showRunCycleDistanceAttr && (
        <>
          <Text style={styles.label}>Distance (km)*</Text>
          <TextInput
            label="Distance in kilometers"
            value={formData.sportSpecific_distance}
            onChangeText={(text) =>
              handleChange("sportSpecific_distance", text)
            }
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            error={!!errors.sportSpecific_distance}
          />
          {errors.sportSpecific_distance && (
            <HelperText type="error">
              {errors.sportSpecific_distance}
            </HelperText>
          )}
        </>
      )}

      {showRunPaceAttr && (
        <>
          <Text style={styles.label}>Target Pace (min/km)</Text>
          <View style={styles.paceInputContainer}>
            <TextInput
              label="Mins"
              value={formData.sportSpecific_pace_minutes}
              onChangeText={(text) =>
                handleChange("sportSpecific_pace_minutes", text)
              }
              mode="outlined"
              style={styles.paceInput}
              keyboardType="number-pad"
              error={!!errors.sportSpecific_pace_minutes}
              maxLength={2}
            />
            <Text
              style={{
                fontSize: 18,
                marginHorizontal: 5,
                color: theme.colors.onSurfaceVariant,
              }}
            >
              :
            </Text>
            <TextInput
              label="Secs"
              value={formData.sportSpecific_pace_seconds}
              onChangeText={(text) =>
                handleChange("sportSpecific_pace_seconds", text)
              }
              mode="outlined"
              style={styles.paceInput}
              keyboardType="number-pad"
              error={!!errors.sportSpecific_pace_seconds}
              maxLength={2}
            />
          </View>
          {(errors.sportSpecific_pace_minutes ||
            errors.sportSpecific_pace_seconds) && (
            <HelperText type="error" visible={true}>
              {errors.sportSpecific_pace_minutes ||
                errors.sportSpecific_pace_seconds ||
                "Pace minutes and seconds must be 0-59."}
            </HelperText>
          )}
        </>
      )}

      <TextInput
        label="Max Participants (optional)"
        value={formData.maxParticipants}
        onChangeText={(text) => handleChange("maxParticipants", text)}
        mode="outlined"
        style={styles.input}
        keyboardType="number-pad"
        error={!!errors.maxParticipants}
      />
      {errors.maxParticipants && (
        <HelperText type="error">{errors.maxParticipants}</HelperText>
      )}

      <PrivacySelector
        context={clubId ? "club_event" : "personal_event"}
        currentPrivacy={formData.privacy}
        onPrivacyChange={(value) => handleChange("privacy", value)}
        error={errors.privacy}
      />

      <TextInput
        label="Cover Image URL (optional)"
        value={formData.coverImageUrl}
        onChangeText={(text) => handleChange("coverImageUrl", text)}
        mode="outlined"
        style={styles.input}
        keyboardType="url"
        left={<TextInput.Icon icon="image-outline" />}
        error={!!errors.coverImageUrl}
      />
      {errors.coverImageUrl && (
        <HelperText type="error">{errors.coverImageUrl}</HelperText>
      )}

      {errors.submit && (
        <HelperText
          type="error"
          visible={!!errors.submit}
          style={styles.submitErrorText}
        >
          {errors.submit}
        </HelperText>
      )}
      <Button
        mode="contained"
        onPress={handleFinalSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={styles.publishButton}
        icon={isEditMode ? "content-save-edit-outline" : "publish"}
      >
        {isSubmitting
          ? isEditMode
            ? "Saving..."
            : "Publishing..."
          : isEditMode
          ? "Save Changes"
          : "Publish Event"}
      </Button>
    </View>
  );
};

export default EventOverviewAndDetails;

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    stepTitle: {
      marginBottom: 10,
      fontWeight: "bold",
      fontSize: 18,
      textAlign: "center",
      color: theme.colors.primary,
    },
    subHeader: {
      marginTop: 20,
      marginBottom: 10,
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.onSurfaceVariant,
    },
    reviewSectionCard: {
      marginBottom: 15,
      elevation: 1,
      borderColor: theme.colors.outlineVariant,
      borderWidth: 0.5,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 5,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.secondary,
    },
    editButtonLabel: { fontSize: 14, color: theme.colors.primary },
    detailLabel: { fontWeight: "bold", color: theme.colors.onSurfaceVariant },
    detailText: { color: theme.colors.onSurface },
    input: { marginBottom: 12 },
    label: {
      fontSize: 16,
      marginBottom: 6,
      marginTop: 10,
      fontWeight: "500",
      color: theme.colors.onSurfaceVariant,
    },
    publishButton: { marginTop: 30, paddingVertical: 8, marginBottom: 20 },
    submitErrorText: {
      textAlign: "center",
      fontSize: 14,
      marginTop: 10,
      color: theme.colors.error,
    },
    previewSectionContent: { paddingHorizontal: 16, paddingBottom: 12 },
    paceInputContainer: { flexDirection: "row", alignItems: "center" }, // justifyContent: 'space-between'
    paceInput: { flex: 1, marginHorizontal: 4 },
    caption: {
      marginBottom: 10,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
  });
