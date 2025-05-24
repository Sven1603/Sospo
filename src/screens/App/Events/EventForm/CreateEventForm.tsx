import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import {
  Button,
  Text,
  ActivityIndicator,
  Snackbar,
  useTheme,
  ProgressBar,
  Caption,
  MD3Theme,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../../navigation/types";
import { supabase } from "../../../../lib/supabase";

import { EventFormData, SportType } from "./eventForm.types";
import {
  chooseSportTypesSchema,
  setEventLocationSchema,
  setEventDateTimeSchema,
  eventDetailsSchema,
} from "./eventForm.schemas";

import ChooseSportTypes from "./ChooseSportTypes";
import SetEventLocation from "./SetEventLocation";
import DateTimeRecurrence from "./DateTimeRecurrence";
import EventOverviewAndDetails from "./EventOverviewAndDetails";

export const initialEventFormData: EventFormData = {
  eventName: "",
  description: "",
  selectedSportTypeIds: [],
  startTime: new Date(new Date().setHours(new Date().getHours() + 1, 0, 0, 0)),
  endTime: null,
  isRecurring: false,
  recurrencePattern: "none",
  seriesEndDate: null,
  sportSpecific_distance: "",
  sportSpecific_pace_minutes: "",
  sportSpecific_pace_seconds: "",
  locationText: "",
  latitude: null,
  longitude: null,
  map_derived_address: null,
  privacy: "public",
  maxParticipants: "",
  coverImageUrl: "",
};

type Props = NativeStackScreenProps<MainAppStackParamList, "CreateEventScreen">;

const CreateEventForm: React.FC<Props> = ({ route, navigation }) => {
  const { clubId, clubName } = route.params || {};
  const theme = useTheme<MD3Theme>();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4; // 1. Sports, 2. Location, 3. Date/Time, 4. Overview/Details + Publish

  const [formData, setFormData] = useState<EventFormData>({
    ...initialEventFormData,
    // privacy: clubId ? "controlled" : "public", // TODO: derive from clubs settings
    startTime: new Date(
      new Date().setHours(new Date().getHours() + 1, 0, 0, 0)
    ), // Default to next hour
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const [availableSportTypes, setAvailableSportTypes] = useState<SportType[]>(
    []
  );
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [currentUserAuthId, setCurrentUserAuthId] = useState<string | null>(
    null
  );

  useEffect(() => {
    navigation.setOptions({
      title: clubName ? `New Event for ${clubName}` : "Create New Event",
    });
    let isMounted = true;
    const initialize = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (user) {
        setCurrentUserAuthId(user.id);
      } else {
        Alert.alert("Authentication Error", "You must be logged in.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        setLoadingInitialData(false);
        return;
      }

      const { data: sportsData, error: fetchError } = await supabase
        .from("sport_types")
        .select("id, name")
        .order("name");
      if (!isMounted) return;
      if (fetchError) {
        console.error("Error fetching sport types:", fetchError);
        setErrors((prev) => ({
          ...prev,
          _sportTypesLoad: "Could not load sport type options.",
        }));
      } else if (sportsData) {
        setAvailableSportTypes(sportsData as SportType[]);
        setErrors((prev) => ({ ...prev, _sportTypesLoad: undefined }));
      }
      setLoadingInitialData(false);
    };
    initialize();
    return () => {
      isMounted = false;
    };
  }, [navigation, clubName]);

  const handleChange = useCallback(
    (field: keyof EventFormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field as string]) {
        setErrors((prev) => ({ ...prev, [field as string]: undefined }));
      }
    },
    [errors]
  );

  const handleToggleSportType = useCallback(
    (sportTypeId: string) => {
      const newSelectedIds = formData.selectedSportTypeIds.includes(sportTypeId)
        ? formData.selectedSportTypeIds.filter((id) => id !== sportTypeId)
        : [...formData.selectedSportTypeIds, sportTypeId];
      handleChange("selectedSportTypeIds", newSelectedIds);
      if (errors.selectedSportTypeIds && newSelectedIds.length > 0) {
        setErrors((prev) => ({ ...prev, selectedSportTypeIds: undefined }));
      }
    },
    [formData.selectedSportTypeIds, handleChange, errors.selectedSportTypeIds]
  );

  const validateStep = useCallback(
    (step: number): boolean => {
      let schemaToUse;
      let dataToValidate: any;
      // fieldsInStep helps in clearing errors only for the fields of the current step
      let fieldsInStep: Array<keyof EventFormData | string> = [];

      if (step === 1) {
        // Choose Sport Type(s)
        schemaToUse = chooseSportTypesSchema;
        dataToValidate = {
          selectedSportTypeIds: formData.selectedSportTypeIds,
        };
        fieldsInStep = ["selectedSportTypeIds"];
      } else if (step === 2) {
        // Location
        schemaToUse = setEventLocationSchema;
        dataToValidate = {
          latitude: formData.latitude,
          longitude: formData.longitude,
          map_derived_address: formData.map_derived_address,
          locationText: formData.locationText,
        };
        fieldsInStep = [
          "latitude",
          "longitude",
          "map_derived_address",
          "locationText",
        ];
      } else if (step === 3) {
        // Date, Time & Recurrence
        schemaToUse = setEventDateTimeSchema;
        dataToValidate = {
          startTime: formData.startTime,
          endTime: formData.endTime,
          isRecurring: formData.isRecurring,
          recurrencePattern: formData.isRecurring
            ? formData.recurrencePattern
            : "none",
          seriesEndDate: formData.isRecurring ? formData.seriesEndDate : null,
        };
        fieldsInStep = [
          "startTime",
          "endTime",
          "isRecurring",
          "recurrencePattern",
          "seriesEndDate",
        ];
      } else if (step === 4) {
        // Overview & Details (inputs on this final step)
        schemaToUse = eventDetailsSchema;
        dataToValidate = {
          eventName: formData.eventName,
          description: formData.description,
          maxParticipants: formData.maxParticipants, // Validated as string by schema
          sportSpecific_distance: formData.sportSpecific_distance, // Validated as string
          sportSpecific_pace_minutes: formData.sportSpecific_pace_minutes, // Validated as string
          sportSpecific_pace_seconds: formData.sportSpecific_pace_seconds, // Validated as string
          privacy: formData.privacy,
          coverImageUrl: formData.coverImageUrl,
          // Assuming latitude and longitude are part of eventDetailsSchema if they are input on this step
          // latitude: formData.latitude,
          // longitude: formData.longitude,
        };
        fieldsInStep = [
          "eventName",
          "description",
          "maxParticipants",
          "sportSpecific_distance",
          "sportSpecific_pace_minutes",
          "sportSpecific_pace_seconds",
          "privacy",
          "coverImageUrl", //, 'latitude', 'longitude'
        ];
      } else {
        return true; // No validation for steps outside this range
      }

      if (!schemaToUse) {
        console.warn(`No Zod schema defined for validation of step ${step}.`);
        // Clear errors for this step's fields if no schema, assuming they are valid by default
        const currentStepErrorsToClear: Record<string, string | undefined> = {};
        fieldsInStep.forEach((field) => {
          currentStepErrorsToClear[field as string] = undefined;
        });
        setErrors((prevErrors) => ({
          ...prevErrors,
          ...currentStepErrorsToClear,
        }));
        return true;
      }

      const result = schemaToUse.safeParse(dataToValidate);

      // Prepare to update errors: clear old errors for fields in this step first
      const stepSpecificErrorUpdates: Record<string, string | undefined> = {};
      fieldsInStep.forEach((field) => {
        stepSpecificErrorUpdates[field as string] = undefined; // Clear by setting to undefined
      });

      if (!result.success) {
        const zodFieldErrors = result.error.flatten().fieldErrors;
        // Map Zod errors to our state structure
        (
          Object.keys(zodFieldErrors) as Array<keyof typeof zodFieldErrors>
        ).forEach((key) => {
          const errorKey = key as string; // Zod path might be array for nested, handle if complex
          if (
            zodFieldErrors[errorKey as keyof typeof zodFieldErrors] &&
            fieldsInStep.includes(errorKey as keyof EventFormData)
          ) {
            // Ensure error key is relevant to current step
            stepSpecificErrorUpdates[errorKey] =
              zodFieldErrors[errorKey as keyof typeof zodFieldErrors]![0]; // Take the first error message
          }
        });
        setErrors((prevErrors) => ({
          ...prevErrors,
          ...stepSpecificErrorUpdates,
        }));
        return false;
      }

      // If successful, ensure errors for this step's fields are cleared
      setErrors((prevErrors) => ({
        ...prevErrors,
        ...stepSpecificErrorUpdates,
      }));
      // We are NOT updating formData with result.data here to keep formData primarily string-based for TextInputs.
      // Transformations will be handled in handleFinalSubmit.
      return true;
    },
    [formData, availableSportTypes, currentStep]
  );

  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [currentStep, totalSteps, validateStep]);

  const prevStep = useCallback(
    () => setCurrentStep((prev) => Math.max(prev - 1, 1)),
    []
  );
  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) setCurrentStep(step);
    },
    [totalSteps]
  );

  const handleFinalSubmit = useCallback(async () => {
    if (!currentUserAuthId) {
      Alert.alert(
        "Authentication Error",
        "User session not found. Please re-login."
      );
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setErrors({}); // Clear previous submission errors

    // --- Consolidate and Validate Data from formData using Zod Schemas ---
    // It's good practice to validate the relevant parts again to get transformed values.

    // Step 1 Data (Sports)
    const step1Validation = chooseSportTypesSchema.safeParse({
      selectedSportTypeIds: formData.selectedSportTypeIds,
    });
    if (!step1Validation.success) {
      setCurrentStep(1);
      Alert.alert(
        "Validation Error",
        "Please correct errors in Step 1 (Sports)."
      );
      // Optionally map Zod errors to your 'errors' state here too if needed
      setIsSubmitting(false);
      return;
    }
    const validatedStep1Data = step1Validation.data;

    // Step 2 Data (Location)
    const step2Validation = setEventLocationSchema.safeParse({
      latitude: formData.latitude,
      longitude: formData.longitude,
      locationText: formData.locationText,
    });
    if (!step2Validation.success) {
      setCurrentStep(2);
      Alert.alert(
        "Validation Error",
        "Please correct errors in Step 2 (Location)."
      );
      setIsSubmitting(false);
      return;
    }
    const validatedStep2Data = step2Validation.data;

    // Step 3 Data (Date/Time/Recurrence)
    const step3Validation = setEventDateTimeSchema.safeParse({
      startTime: formData.startTime,
      endTime: formData.endTime,
      isRecurring: formData.isRecurring,
      recurrencePattern: formData.isRecurring
        ? formData.recurrencePattern
        : "none",
      seriesEndDate: formData.isRecurring ? formData.seriesEndDate : null,
    });
    if (!step3Validation.success) {
      setCurrentStep(3);
      Alert.alert(
        "Validation Error",
        "Please correct errors in Step 3 (Date & Time)."
      );
      // Optionally map Zod errors to 'errors' state
      const fieldErrors = step3Validation.error.flatten().fieldErrors;
      const step3Errors: Record<string, string | undefined> = {};
      (Object.keys(fieldErrors) as Array<keyof typeof fieldErrors>).forEach(
        (key) => {
          step3Errors[key as string] = (fieldErrors as any)[key]?.[0];
        }
      );
      setErrors((prev) => ({ ...prev, ...step3Errors }));
      setIsSubmitting(false);
      return;
    }
    const validatedStep3Data = step3Validation.data;

    // Step 4 Data (Overview/Details Inputs)
    const step4Validation = eventDetailsSchema.safeParse({
      eventName: formData.eventName,
      description: formData.description,
      maxParticipants: formData.maxParticipants, // Zod schema transforms this to number|null
      sportSpecific_distance: formData.sportSpecific_distance, // Zod schema transforms this to number|null
      sportSpecific_pace_minutes: formData.sportSpecific_pace_minutes,
      sportSpecific_pace_seconds: formData.sportSpecific_pace_seconds,
      privacy: formData.privacy,
      coverImageUrl: formData.coverImageUrl,
      latitude: formData.latitude,
      longitude: formData.longitude,
    });

    if (!step4Validation.success) {
      setCurrentStep(4);
      Alert.alert(
        "Validation Error",
        "Please correct errors in the final details (Step 4)."
      );
      const fieldErrors = step4Validation.error.flatten().fieldErrors;
      const step4Errors: Record<string, string | undefined> = {};
      (Object.keys(fieldErrors) as Array<keyof typeof fieldErrors>).forEach(
        (key) => {
          step4Errors[key as string] = (fieldErrors as any)[key]?.[0];
        }
      );
      setErrors((prev) => ({ ...prev, ...step4Errors }));
      setIsSubmitting(false);
      return;
    }
    const validatedStep4Data = step4Validation.data;

    // --- Prepare data for RPC ---
    const sportSpecificDataToPackage: Record<string, any> = {};
    if (
      validatedStep4Data.sportSpecific_distance !== null &&
      validatedStep4Data.sportSpecific_distance !== undefined
    ) {
      sportSpecificDataToPackage.distance_km =
        validatedStep4Data.sportSpecific_distance; // This is now number | null
    }

    const paceMinsStr = formData.sportSpecific_pace_minutes; // Use original string from formData for parsing
    const paceSecsStr = formData.sportSpecific_pace_seconds;
    if (
      (paceMinsStr && paceMinsStr.trim() !== "") ||
      (paceSecsStr && paceSecsStr.trim() !== "")
    ) {
      const mins = paceMinsStr ? parseInt(paceMinsStr, 10) : 0;
      const secs = paceSecsStr ? parseInt(paceSecsStr, 10) : 0;
      if (
        !isNaN(mins) &&
        !isNaN(secs) &&
        mins >= 0 &&
        mins <= 59 &&
        secs >= 0 &&
        secs <= 59
      ) {
        if (mins > 0 || secs > 0) {
          // Only add if pace is actually set
          sportSpecificDataToPackage.pace_seconds_per_km = mins * 60 + secs;
        }
      } else {
        // This should have been caught by Zod, but as a safeguard
        setErrors((prev) => ({ ...prev, submit: "Invalid pace values." }));
        setIsSubmitting(false);
        return;
      }
    }
    const sportSpecificJSON =
      Object.keys(sportSpecificDataToPackage).length > 0
        ? sportSpecificDataToPackage
        : null;

    let recurrenceRuleToPassToDb = null;
    if (
      validatedStep3Data.isRecurring &&
      validatedStep3Data.recurrencePattern !== "none" &&
      validatedStep3Data.startTime
    ) {
      // The DB function `create_event_and_link_sports` expects 'weekly' or 'monthly' directly for p_recurrence_pattern
      recurrenceRuleToPassToDb = validatedStep3Data.recurrencePattern;
    }

    try {
      const paramsForRPC = {
        // Parameter names here MUST match PostgreSQL function definition
        p_name: validatedStep4Data.eventName,
        p_description: validatedStep4Data.description || null,
        p_first_occurrence_start_time: formData.startTime!.toISOString(),
        p_first_occurrence_end_time: formData.endTime?.toISOString() || null,
        p_location_text: validatedStep2Data.locationText,
        p_latitude: formData.latitude,
        p_longitude: formData.longitude,
        p_map_derived_address: formData.map_derived_address || null,
        p_privacy: validatedStep4Data.privacy,
        p_club_id: clubId || null,
        p_max_participants: validatedStep4Data.maxParticipants,
        p_cover_image_url: validatedStep4Data.coverImageUrl || null,
        p_selected_sport_type_ids: validatedStep1Data.selectedSportTypeIds,
        p_is_actually_recurring: validatedStep3Data.isRecurring,
        p_recurrence_pattern: recurrenceRuleToPassToDb, // This should be 'weekly', 'monthly', or null
        p_series_end_date:
          validatedStep3Data.isRecurring && validatedStep3Data.seriesEndDate
            ? validatedStep3Data.seriesEndDate.toISOString().split("T")[0]
            : null,
        p_sport_specific_attributes: sportSpecificJSON,
      };

      console.log(
        "Submitting to RPC create_event_and_link_sports with params:",
        JSON.stringify(paramsForRPC, null, 2)
      );

      const { data: newEventId, error: rpcError } = await supabase.rpc(
        "create_event_and_link_sports",
        paramsForRPC
      );

      if (rpcError) throw rpcError;

      if (newEventId) {
        setSnackbarMessage("Event created successfully!");
        setSnackbarVisible(true);

        // Navigate to the newly created event's detail screen
        setTimeout(() => {
          navigation.replace("EventDetailScreen", {
            eventId: newEventId as string,
            eventName: paramsForRPC.p_name,
          });
        }, 1500); // Delay for snackbar
      } else {
        // The function returns UUID of the first event, or SETOF UUIDs if you changed it back
        // If it returns a single UUID, this check is good. If SETOF, data might be an array.
        // Let's assume it returns the first event ID as UUID.
        console.warn(
          "No event ID returned from RPC, but no error. Data:",
          newEventId
        );
        setSnackbarMessage("Event created, but no ID returned from function.");
        setSnackbarVisible(true);
        // Fallback navigation
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (e: any) {
      console.error("Error creating event (final submit):", e);
      const errorMessage =
        e.message || "An unexpected error occurred during event creation.";
      setErrors((prev) => ({ ...prev, submit: errorMessage }));
      Alert.alert("Event Creation Failed", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formData,
    clubId,
    currentUserAuthId,
    validateStep,
    navigation,
    totalSteps,
    availableSportTypes,
  ]);

  const renderCurrentStepComponent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ChooseSportTypes
            selectedSportTypeIds={formData.selectedSportTypeIds}
            onToggleSportType={handleToggleSportType}
            availableSportTypes={availableSportTypes}
            loadingSportTypes={loadingInitialData}
            errors={{
              selectedSportTypeIds: errors.selectedSportTypeIds,
              _sportTypesLoad: errors._sportTypesLoad,
            }}
            theme={theme}
          />
        );
      case 2:
        return (
          <SetEventLocation
            formData={formData}
            handleChange={handleChange}
            errors={errors}
            theme={theme}
          />
        );
      case 3:
        return (
          <DateTimeRecurrence
            formData={formData}
            handleChange={handleChange}
            errors={errors}
            theme={theme}
          />
        );
      case 4:
        return (
          <EventOverviewAndDetails
            formData={formData}
            availableSportTypes={availableSportTypes}
            clubId={clubId}
            handleChange={handleChange}
            goToStep={goToStep}
            handleFinalSubmit={handleFinalSubmit}
            isSubmitting={isSubmitting}
            theme={theme}
            errors={errors}
          />
        );
      default:
        return <ActivityIndicator />;
    }
  };

  if (loadingInitialData && !currentUserAuthId) {
    // Show loader until user and sports are attempted
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading form...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingView}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // Adjust if you have a custom header height
    >
      <View style={styles.mainViewContainer}>
        <ProgressBar
          progress={currentStep / totalSteps}
          color={theme.colors.primary}
          style={styles.progressBar}
        />
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.stepIndicator, { color: theme.colors.outline }]}>
            Step {currentStep} of {totalSteps}{" "}
            {clubName ? `- Event for ${clubName}` : ""}
          </Text>
          {clubName && (
            <Caption
              style={[
                styles.clubContextText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Creating event for: {clubName}
            </Caption>
          )}

          {renderCurrentStepComponent()}
        </ScrollView>

        <View style={styles.navigationButtons}>
          {currentStep > 1 ? (
            <Button
              mode="outlined"
              onPress={prevStep}
              style={styles.navButton}
              disabled={isSubmitting}
            >
              Back
            </Button>
          ) : (
            <View style={styles.navButtonPlaceholder} />
          )}

          {currentStep < totalSteps ? (
            <Button
              mode="contained"
              onPress={nextStep}
              style={styles.navButton}
              disabled={isSubmitting}
            >
              Next
            </Button>
          ) : (
            <View style={styles.navButtonPlaceholder} />
          )}
        </View>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          action={{ label: "OK", onPress: () => setSnackbarVisible(false) }}
        >
          {snackbarMessage}
        </Snackbar>

        {/* --- DateTimePickerModal Integration --- */}
        {/* You need to install and import your chosen DateTimePicker, e.g., react-native-modal-datetime-picker */}
        {/* Example:
          {pickerConfig.targetField && (
            <DateTimePickerModal
              isVisible={pickerConfig.isVisible}
              mode={pickerConfig.mode}
              date={pickerConfig.currentDate || new Date()}
              onConfirm={handleDateConfirm}
              onCancel={hidePicker}
              minimumDate={
                  pickerConfig.targetField === 'endTime' && formData.startTime 
                  ? new Date(formData.startTime.getTime() + 60000) 
                  : pickerConfig.targetField === 'seriesEndDate' && formData.startTime 
                  ? formData.startTime 
                  : undefined // No minimum for startTime by default
              }
            />
          )}
          */}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  mainViewContainer: {
    flex: 1,
    backgroundColor: "white", // Use theme background
  },
  progressBar: {
    height: 8,
    // No margin needed, part of the main view's flow or absolute positioning
  },
  scrollContainer: {
    flex: 1, // Allows ScrollView to take available space BEFORE the absolute footer
  },
  scrollContentContainer: {
    padding: 20, // Horizontal and top padding for content
    paddingBottom: 120, // <<< INCREASED PADDING: Ample space for the fixed footer buttons
  },
  stepIndicator: {
    textAlign: "center",
    marginVertical: 10,
    fontSize: 12,
  },
  clubContextText: {
    textAlign: "center",
    marginBottom: 20,
    fontStyle: "italic",
  },
  navigationButtons: {
    position: "absolute", // <<< Makes it an overlay at the bottom
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20, // Side padding for buttons
    paddingTop: 15, // Padding above buttons
    paddingBottom: Platform.OS === "ios" ? 30 : 15, // Padding below buttons (for safe area notch etc.)
    borderTopWidth: 1,
    borderTopColor: "black", // Use theme
    backgroundColor: "white", // Use theme
    elevation: 4, // Optional: add some elevation if needed
  },
  navButton: {
    flex: 1, // Makes "Back" and "Next" share space
    marginHorizontal: 5,
  },
  navButtonPlaceholder: {
    // To maintain layout when one button is hidden
    flex: 1,
    marginHorizontal: 5,
  },
  centered: {
    // For loading/error states within step components if needed
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  placeholderText: {
    // For unimplemented steps
    padding: 20,
    textAlign: "center",
    fontSize: 16,
    color: "gray", // Use theme
  },
});

export default CreateEventForm;
