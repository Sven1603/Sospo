// src/screens/App/CreateEventForm/DateTimeRecurrence.tsx
import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import {
  Text,
  Button,
  Switch,
  SegmentedButtons,
  HelperText,
  Title,
  Caption,
  Divider,
  MD3Theme,
} from "react-native-paper";
import { EventFormData } from "./eventForm.types"; // Or from './index'
import { DatePickerModal, TimePickerModal } from "react-native-paper-dates"; // Import pickers and locales

interface DateTimeRecurrenceProps {
  formData: Pick<
    EventFormData,
    | "startTime"
    | "endTime"
    | "isRecurring"
    | "recurrencePattern"
    | "seriesEndDate"
  >;
  handleChange: (
    // Ensure this matches the parent's handleChange type exactly
    field: keyof EventFormData,
    value: any
  ) => void;
  isEditMode?: boolean;
  errors: Partial<
    Record<
      | "startTime"
      | "endTime"
      | "isRecurring"
      | "recurrencePattern"
      | "seriesEndDate",
      string | null | undefined
    >
  >;
  theme: MD3Theme;
}

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    stepTitle: {
      marginBottom: 24,
      fontWeight: "bold",
      fontSize: 18,
      textAlign: "center",
      color: theme.colors.primary,
    },
    input: { marginBottom: 12 }, // General spacing for inputs/buttons
    inputButton: {
      marginBottom: 4, // Reduced margin before HelperText/Caption
      paddingVertical: 8,
      borderColor: theme.colors.outline,
      justifyContent: "flex-start", // Align text to left
    },
    buttonLabel: { fontSize: 16, color: theme.colors.onSurface }, // Ensure text color is visible
    label: {
      fontSize: 16,
      marginBottom: 8,
      marginTop: 12,
      fontWeight: "500",
      color: theme.colors.onSurfaceVariant,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
      paddingVertical: 8,
    },
    recurringSection: {
      marginTop: 10,
      paddingLeft: 10,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.primaryContainer,
    },
    caption: {
      marginBottom: 12,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    divider: { marginVertical: 15 },
  });

const DateTimeRecurrence: React.FC<DateTimeRecurrenceProps> = ({
  formData,
  handleChange,
  isEditMode,
  errors,
  theme,
}) => {
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  // State for Date/Time Picker Modals from react-native-paper-dates
  const [startTimeDateOpen, setStartTimeDateOpen] = useState(false);
  const [startTimeTimeOpen, setStartTimeTimeOpen] = useState(false);

  const [endTimeDateOpen, setEndTimeDateOpen] = useState(false);
  const [endTimeTimeOpen, setEndTimeTimeOpen] = useState(false);

  const [recurrenceEndDateOpen, setRecurrenceEndDateOpen] = useState(false);

  const onDismissStartTimeDate = useCallback(
    () => setStartTimeDateOpen(false),
    []
  );
  const onConfirmStartTimeDate = useCallback(
    ({ date }: { date: Date | undefined | null }) => {
      // react-native-paper-dates uses { date }
      setStartTimeDateOpen(false);
      if (date) {
        const currentStartTime = formData.startTime || new Date();
        date.setHours(
          currentStartTime.getHours(),
          currentStartTime.getMinutes()
        ); // Preserve time part
        handleChange("startTime", date);
        setStartTimeTimeOpen(true); // Open time picker next
      }
    },
    [formData.startTime, handleChange]
  );

  const onDismissStartTimeTime = useCallback(
    () => setStartTimeTimeOpen(false),
    []
  );
  const onConfirmStartTimeTime = useCallback(
    ({ hours, minutes }: { hours: number; minutes: number }) => {
      setStartTimeTimeOpen(false);
      const newStartTime = formData.startTime
        ? new Date(formData.startTime)
        : new Date();
      newStartTime.setHours(hours, minutes, 0, 0); // Set seconds and ms to 0
      handleChange("startTime", newStartTime);
    },
    [formData.startTime, handleChange]
  );

  const onDismissEndTimeDate = useCallback(() => setEndTimeDateOpen(false), []);
  const onConfirmEndTimeDate = useCallback(
    ({ date }: { date: Date | undefined | null }) => {
      setEndTimeDateOpen(false);
      if (date) {
        const currentEndTime =
          formData.endTime || formData.startTime || new Date();
        date.setHours(currentEndTime.getHours(), currentEndTime.getMinutes());
        handleChange("endTime", date);
        setEndTimeTimeOpen(true);
      }
    },
    [formData.endTime, formData.startTime, handleChange]
  );

  const onDismissEndTimeTime = useCallback(() => setEndTimeTimeOpen(false), []);
  const onConfirmEndTimeTime = useCallback(
    ({ hours, minutes }: { hours: number; minutes: number }) => {
      setEndTimeTimeOpen(false);
      let newEndTime = formData.endTime
        ? new Date(formData.endTime)
        : formData.startTime
        ? new Date(formData.startTime)
        : new Date();
      // If only date was set for end time, use current time for default, then update
      if (!formData.endTime)
        newEndTime = new Date(newEndTime.setHours(hours, minutes, 0, 0));
      else newEndTime.setHours(hours, minutes, 0, 0);
      handleChange("endTime", newEndTime);
    },
    [formData.endTime, formData.startTime, handleChange]
  );

  const onDismissRecurrenceEndDate = useCallback(
    () => setRecurrenceEndDateOpen(false),
    []
  );
  const onConfirmRecurrenceEndDate = useCallback(
    ({ date }: { date: Date | undefined | null }) => {
      setRecurrenceEndDateOpen(false);
      handleChange("seriesEndDate", date || null); // Pass null if date is undefined
    },
    [handleChange]
  );

  const onToggleRecurring = () => {
    const newIsRecurring = !formData.isRecurring;
    handleChange("isRecurring", newIsRecurring);
    if (!newIsRecurring) {
      handleChange("recurrencePattern", "none");
      handleChange("seriesEndDate", null);
    } else {
      if (formData.recurrencePattern === "none") {
        handleChange("recurrencePattern", "weekly"); // Default to weekly
      }
    }
  };

  const recurrencePatternOptions = [
    { label: "Weekly", value: "weekly", icon: "calendar-week" },
    { label: "Monthly", value: "monthly", icon: "calendar-month" },
  ];

  return (
    <View>
      <Title style={styles.stepTitle}>Step 2: Date, Time & Recurrence</Title>

      <Text style={styles.label}>Start Date & Time*</Text>
      <Button
        onPress={() => setStartTimeDateOpen(true)}
        mode="outlined"
        icon="calendar-clock"
        style={styles.inputButton}
        labelStyle={styles.buttonLabel}
        contentStyle={{ justifyContent: "flex-start" }}
      >
        {formData.startTime
          ? formData.startTime.toLocaleString([], {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Select Date & Time"}
      </Button>
      {errors.startTime && (
        <HelperText type="error" visible={!!errors.startTime}>
          {errors.startTime}
        </HelperText>
      )}

      <Text style={styles.label}>End Date & Time (Optional)</Text>
      <Button
        onPress={() => setEndTimeDateOpen(true)}
        mode="outlined"
        icon="calendar-clock"
        style={styles.inputButton}
        labelStyle={styles.buttonLabel}
        contentStyle={{ justifyContent: "flex-start" }}
      >
        {formData.endTime
          ? formData.endTime.toLocaleString([], {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Select Date & Time"}
      </Button>
      {errors.endTime && (
        <HelperText type="error" visible={!!errors.endTime}>
          {errors.endTime}
        </HelperText>
      )}
      <Caption style={styles.caption}>
        If no end time, event duration is assumed to be flexible or short.
      </Caption>

      {!isEditMode && (
        <>
          <Divider style={styles.divider} />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Is this a recurring event?</Text>
            <Switch
              value={formData.isRecurring}
              onValueChange={onToggleRecurring}
              color={theme.colors.primary}
            />
          </View>

          {formData.isRecurring && (
            <View style={styles.recurringSection}>
              <Text style={[styles.label, { marginTop: 0 }]}>Repeats*</Text>
              <SegmentedButtons
                value={
                  formData.recurrencePattern === "none"
                    ? ""
                    : formData.recurrencePattern
                }
                onValueChange={(value) => {
                  if (value) {
                    handleChange(
                      "recurrencePattern",
                      value as "weekly" | "monthly"
                    );
                  } else {
                    handleChange("recurrencePattern", "none");
                  } // Default if deselected (though Zod requires selection)
                }}
                buttons={recurrencePatternOptions}
                style={styles.input}
                density="medium"
              />
              {errors.recurrencePattern && (
                <HelperText type="error" visible={!!errors.recurrencePattern}>
                  {errors.recurrencePattern}
                </HelperText>
              )}
              <Caption style={styles.caption}>
                Event repeats on the same day of the week/month as the start
                date.
              </Caption>

              <Text style={styles.label}>Recurrence Ends On (Optional)</Text>
              <Button
                onPress={() => setRecurrenceEndDateOpen(true)}
                mode="outlined"
                icon="calendar-range"
                style={styles.inputButton}
                labelStyle={styles.buttonLabel}
                contentStyle={{ justifyContent: "flex-start" }}
              >
                {formData.seriesEndDate
                  ? formData.seriesEndDate.toLocaleDateString()
                  : "Select Date"}
              </Button>
              {errors.seriesEndDate && (
                <HelperText type="error" visible={!!errors.seriesEndDate}>
                  {errors.seriesEndDate}
                </HelperText>
              )}
              <Caption style={styles.caption}>
                If no end date, it may recur based on system defaults or
                indefinitely.
              </Caption>
            </View>
          )}
        </>
      )}

      {/* DatePickerModal for Start Date */}
      <DatePickerModal
        locale="en-GB" // Or your preferred locale, ensure it's registered
        mode="single"
        visible={startTimeDateOpen}
        onDismiss={onDismissStartTimeDate}
        date={formData.startTime || undefined}
        onConfirm={onConfirmStartTimeDate}
        saveLabel="Next" // To select time
        validRange={{ startDate: new Date() }}
      />
      {/* TimePickerModal for Start Time */}
      <TimePickerModal
        visible={startTimeTimeOpen}
        onDismiss={onDismissStartTimeTime}
        onConfirm={onConfirmStartTimeTime}
        hours={formData.startTime ? formData.startTime.getHours() : 12}
        minutes={formData.startTime ? formData.startTime.getMinutes() : 0}
        use24HourClock
      />

      {/* DatePickerModal for Recurrence End Date */}
      <DatePickerModal
        locale="en-GB"
        mode="single"
        visible={recurrenceEndDateOpen}
        onDismiss={onDismissRecurrenceEndDate}
        date={formData.seriesEndDate || undefined}
        onConfirm={onConfirmRecurrenceEndDate}
        validRange={{ startDate: formData.startTime || new Date() }} // Recurrence end date must be after start date
      />
    </View>
  );
};

export default DateTimeRecurrence;
