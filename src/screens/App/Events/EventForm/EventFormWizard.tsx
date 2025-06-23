import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { ActivityIndicator, Snackbar, ProgressBar } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../../navigation/types";
import { supabase } from "../../../../lib/supabase";

import {
  EventFormData,
  initialEventFormData,
  SportType,
} from "./eventForm.types";
import {
  chooseSportTypesSchema,
  setEventLocationSchema,
  setEventDateTimeSchema,
  eventDetailsSchema,
} from "./eventForm.schemas";

// Import Step Components
import ChooseSportTypes from "./ChooseSportTypes";
import SetEventLocation from "./SetEventLocation";
import DateTimeRecurrence from "./DateTimeRecurrence";
import EventOverviewAndDetails from "./EventOverviewAndDetails";
import { AppTheme, useAppTheme } from "../../../../theme/theme";
import StyledText from "../../../../components/ui/StyledText";
import StyledButton from "../../../../components/ui/StyledButton";

type Props = NativeStackScreenProps<MainAppStackParamList, "EventWizardScreen">;

const EventFormWizard: React.FC<Props> = ({ route, navigation }) => {
  const {
    clubId,
    clubName,
    eventId,
    eventName: initialEventName,
  } = route.params || {};
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const [isEditMode, setIsEditMode] = useState<boolean>(!!eventId);
  const [currentStep, setCurrentStep] = useState(isEditMode ? 4 : 1);
  const totalSteps = 4; // 1.Sports, 2.Location, 3.Date/Time, 4.Overview/Details+Publish/Save

  const [formData, setFormData] = useState<EventFormData>(initialEventFormData);
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
    let isMounted = true;
    const initializeForm = async () => {
      setLoadingInitialData(true);
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

      // Fetch available sport types (common for create and edit)
      const { data: sportsData, error: sportsError } = await supabase
        .from("sport_types")
        .select("id, name")
        .order("name");
      if (!isMounted) return;
      if (sportsError) {
        setErrors((prev) => ({
          ...prev,
          _sportTypesLoad: "Could not load sport types.",
        }));
      } else if (sportsData) {
        setAvailableSportTypes(sportsData as SportType[]);
      }

      if (eventId) {
        // Edit Mode
        setIsEditMode(true);
        navigation.setOptions({
          title: `Edit: ${initialEventName || "Event"}`,
        });
        try {
          const { data: eventData, error: eventFetchError } = await supabase
            .from("events")
            .select(`*, event_sport_types(sport_types(id))`) // Fetch all fields + current sport type IDs
            .eq("id", eventId)
            .single();

          if (!isMounted) return;
          if (eventFetchError) throw eventFetchError;

          if (eventData) {
            // Populate formData with existing event data
            // Ensure date strings from DB are converted to Date objects for pickers
            const currentSportTypeIds = (eventData.event_sport_types || [])
              .map(
                (est: any) =>
                  est.sport_types &&
                  (Array.isArray(est.sport_types)
                    ? est.sport_types[0]?.id
                    : est.sport_types?.id)
              )
              .filter(Boolean) as string[];

            setFormData({
              eventName: eventData.name || "",
              description: eventData.description || "",
              selectedSportTypeIds: currentSportTypeIds,
              startTime: eventData.start_time
                ? new Date(eventData.start_time)
                : null,
              endTime: eventData.end_time ? new Date(eventData.end_time) : null,
              // For MVP edit of single instance, recurrence fields are not directly editable from pattern
              isRecurring: eventData.is_recurring || false, // Display if it was part of a series
              recurrencePattern:
                (eventData.recurrence_rule as EventFormData["recurrencePattern"]) ||
                "none", // Display pattern
              seriesEndDate: eventData.recurrence_end_date
                ? new Date(eventData.recurrence_end_date)
                : null, // Display series end

              sportSpecific_distance: String(
                eventData.sport_specific_attributes?.distance_km || ""
              ),
              sportSpecific_pace_minutes: String(
                Math.floor(
                  (eventData.sport_specific_attributes?.pace_seconds_per_km ||
                    0) / 60
                ) || ""
              ),
              sportSpecific_pace_seconds: String(
                (eventData.sport_specific_attributes?.pace_seconds_per_km ||
                  0) % 60 || ""
              ),

              locationText: eventData.location_text || "",
              latitude: eventData.latitude,
              longitude: eventData.longitude,
              map_derived_address: eventData.map_derived_address || null, // Make sure this is fetched
              privacy: eventData.privacy as EventFormData["privacy"],
              maxParticipants: eventData.max_participants?.toString() || "",
              coverImageUrl: eventData.cover_image_url || "",
            });
            if (eventData.name)
              navigation.setOptions({ title: `Edit: ${eventData.name}` }); // Update title with fetched name
          } else {
            throw new Error("Event not found for editing.");
          }
        } catch (e: any) {
          console.error("Error fetching event for editing:", e);
          setErrors((prev) => ({
            ...prev,
            _load: e.message || "Failed to load event data.",
          }));
          Alert.alert("Error", "Could not load event data for editing.", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        }
      } else {
        // Create Mode
        setIsEditMode(false);
        navigation.setOptions({
          title: "New Event",
        });
        setFormData({
          // Reset to initial, considering clubId for privacy
          ...initialEventFormData,
          // privacy: clubId ? "controlled" : "public", TODO: set privacy based on club privacy settings
          startTime: new Date(
            new Date().setHours(new Date().getHours() + 1, 0, 0, 0)
          ),
        });
      }
      setLoadingInitialData(false);
    };
    initializeForm();
    return () => {
      isMounted = false;
    };
  }, [navigation, clubName, eventId, initialEventName, clubId]);

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

  const handleSaveEvent = useCallback(async () => {
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
    let sportSpecificDataToPackage: any = {};
    const distanceVal = parseFloat(
      String(formData.sportSpecific_distance).replace(",", ".")
    );
    if (
      !isNaN(distanceVal) &&
      String(formData.sportSpecific_distance).trim() !== ""
    )
      sportSpecificDataToPackage.distance_km = distanceVal;
    const paceMins = formData.sportSpecific_pace_minutes
      ? parseInt(formData.sportSpecific_pace_minutes, 10)
      : 0;
    const paceSecs = formData.sportSpecific_pace_seconds
      ? parseInt(formData.sportSpecific_pace_seconds, 10)
      : 0;
    if (
      !isNaN(paceMins) &&
      !isNaN(paceSecs) &&
      paceMins >= 0 &&
      paceMins <= 59 &&
      paceSecs >= 0 &&
      paceSecs <= 59 &&
      (paceMins > 0 || paceSecs > 0)
    ) {
      sportSpecificDataToPackage.pace_seconds_per_km = paceMins * 60 + paceSecs;
    }
    const sportSpecificJSON =
      Object.keys(sportSpecificDataToPackage).length > 0
        ? sportSpecificDataToPackage
        : null;

    let recurrenceRuleToPassToDb = null;
    if (
      formData.isRecurring &&
      formData.recurrencePattern !== "none" &&
      formData.startTime
    ) {
      recurrenceRuleToPassToDb = formData.recurrencePattern;
    }
    const finalMaxParticipants =
      formData.maxParticipants &&
      formData.maxParticipants.trim() !== "" &&
      !isNaN(parseInt(formData.maxParticipants))
        ? parseInt(formData.maxParticipants, 10)
        : null;

    const commonEventData = {
      p_name: formData.eventName,
      p_description: formData.description || null,
      p_location_text: formData.locationText,
      p_latitude: formData.latitude,
      p_longitude: formData.longitude,
      p_map_derived_address: formData.map_derived_address || null,
      p_privacy: formData.privacy,
      p_max_participants: finalMaxParticipants,
      p_cover_image_url: formData.coverImageUrl || null,
      p_selected_sport_type_ids: validatedStep1Data.selectedSportTypeIds,
      p_sport_specific_attributes: sportSpecificJSON,
    };

    try {
      let successMessage = "";
      let navigateToEventId: string | undefined = eventId;
      let navigateToEventName: string = formData.eventName;

      if (isEditMode && eventId) {
        // Call update_event_and_link_sports RPC
        const { error: rpcError } = await supabase.rpc(
          "update_event_and_link_sports",
          {
            p_event_id: eventId,
            p_start_time: formData.startTime!.toISOString(),
            p_end_time: formData.endTime?.toISOString() || null,
            ...commonEventData,
          }
        );
        if (rpcError) throw rpcError;
        successMessage = "Event updated successfully!";
      } else {
        // Call create_event_and_link_sports RPC
        const { data: newEventId, error: rpcError } = await supabase.rpc(
          "create_event_and_link_sports",
          {
            ...commonEventData, // Spread common data
            p_club_id: clubId || null,
            // Create function specific recurrence params:
            p_is_actually_recurring: formData.isRecurring,
            p_recurrence_pattern: recurrenceRuleToPassToDb,
            p_first_occurrence_start_time: formData.startTime!.toISOString(),
            p_first_occurrence_end_time:
              formData.endTime?.toISOString() || null,
            p_series_end_date:
              formData.isRecurring && formData.seriesEndDate
                ? formData.seriesEndDate.toISOString().split("T")[0]
                : null,
          }
        );
        if (rpcError) throw rpcError;
        if (!newEventId) throw new Error("No event ID returned on creation.");
        successMessage = "Event created successfully!";
        navigateToEventId = newEventId as string;
      }

      setSnackbarMessage(successMessage);
      setSnackbarVisible(true);
      setTimeout(() => {
        if (navigateToEventId) {
          // Replace current form with EventDetailScreen
          navigation.replace("EventDetailScreen", {
            eventId: navigateToEventId,
            eventName: navigateToEventName,
          });
        } else {
          // Fallback if no ID (shouldn't happen if logic is correct)
          navigation.goBack();
        }
      }, 1500);
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
          />
        );
      case 2:
        return (
          <SetEventLocation
            formData={formData}
            handleChange={handleChange}
            errors={errors}
          />
        );
      case 3:
        return (
          <DateTimeRecurrence
            formData={formData}
            handleChange={handleChange}
            isEditMode={isEditMode}
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
            handleFinalSubmit={handleSaveEvent}
            isSubmitting={isSubmitting}
            isEditMode={isEditMode}
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
        <StyledText>Loading form...</StyledText>
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
          <StyledText color={theme.colors.outline} alignCenter>
            Step {currentStep} of {totalSteps}{" "}
            {clubName ? `- Event for ${clubName}` : ""}
          </StyledText>

          {renderCurrentStepComponent()}
        </ScrollView>

        <View style={styles.navigationButtons}>
          {currentStep > 1 ? (
            <StyledButton
              variant="outline"
              onPress={prevStep}
              size="small"
              disabled={isSubmitting}
            >
              Back
            </StyledButton>
          ) : (
            <View style={styles.navButtonPlaceholder} />
          )}

          {currentStep < totalSteps ? (
            <StyledButton
              onPress={nextStep}
              size="small"
              disabled={isSubmitting}
            >
              Next
            </StyledButton>
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
      </View>
    </KeyboardAvoidingView>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    keyboardAvoidingView: {
      flex: 1,
    },
    mainViewContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      gap: theme.spacing.medium,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.colors.surface,
      // No margin needed, part of the main view's flow or absolute positioning
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContentContainer: {
      padding: 20, // Horizontal and top padding for content
      paddingBottom: 120, // <<< INCREASED PADDING: Ample space for the fixed footer buttons
      gap: theme.spacing.small,
    },
    stepIndicator: {
      textAlign: "center",
      marginVertical: 10,
      fontSize: 12,
    },
    navigationButtons: {
      position: "absolute", // <<< Makes it an overlay at the bottom
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 20, // Side padding for buttons
      paddingTop: theme.spacing.small,
      paddingBottom: Platform.OS === "ios" ? 30 : 15, // Padding below buttons (for safe area notch etc.)
      backgroundColor: theme.colors.background, // Use theme
      elevation: 4, // Optional: add some elevation if needed
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
  });

export default EventFormWizard;
