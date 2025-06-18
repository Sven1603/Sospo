// src/screens/App/CreateEventForm/ChooseSportTypes.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import {
  Text,
  Checkbox,
  HelperText,
  ActivityIndicator,
  Title,
  MD3Theme,
} from "react-native-paper";
import { SportType } from "./eventForm.types";

interface ChooseSportTypesProps {
  // Receives only the part of formData and errors it cares about
  selectedSportTypeIds: string[];
  onToggleSportType: (sportTypeId: string) => void;
  availableSportTypes: SportType[]; // All sports fetched by parent
  loadingSportTypes: boolean;
  errors: Partial<
    Record<
      "selectedSportTypeIds" | "_sportTypesLoad",
      string | null | undefined
    >
  >;
  theme: MD3Theme;
}

// For MVP, we focus on these three in the UI, though DB supports more
const MVP_SPORT_NAMES_LOWERCASE = ["run", "cycle", "swim"];

const ChooseSportTypes: React.FC<ChooseSportTypesProps> = ({
  selectedSportTypeIds,
  onToggleSportType,
  availableSportTypes,
  loadingSportTypes,
  errors,
  theme,
}) => {
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  // Filter available sports to only show the MVP ones, but ensure they exist
  const displayableSportTypes = availableSportTypes.filter((sport) =>
    MVP_SPORT_NAMES_LOWERCASE.includes(sport.name.toLowerCase())
  );

  if (loadingSportTypes) {
    return (
      <ActivityIndicator animating={true} size="large" style={styles.loader} />
    );
  }

  return (
    <View>
      <Title style={styles.stepTitle}>Step 1: Choose Sport Type(s)</Title>
      <Text style={styles.label}>
        Select all applicable sport types for this event*:
      </Text>

      {displayableSportTypes.length > 0
        ? displayableSportTypes.map((sport) => (
            <Checkbox.Item
              key={sport.id}
              label={sport.name}
              status={
                selectedSportTypeIds.includes(sport.id)
                  ? "checked"
                  : "unchecked"
              }
              onPress={() => onToggleSportType(sport.id)}
              position="leading" // Checkbox before label
              style={styles.checkboxItem}
              labelStyle={{ color: theme.colors.onSurface }} // Ensure label is visible
            />
          ))
        : !errors._sportTypesLoad && ( // Only show "No sport types" if there wasn't a loading error
            <Text
              style={{
                color: theme.colors.error,
                marginVertical: 10,
                textAlign: "center",
              }}
            >
              No focus sport types (Running, Cycling, Swimming) found. Please
              ensure they are in the database or contact support.
            </Text>
          )}

      {/* Display error for selecting at least one sport type (from Zod validation) */}
      {errors.selectedSportTypeIds && (
        <HelperText
          type="error"
          visible={!!errors.selectedSportTypeIds}
          style={styles.errorText}
        >
          {errors.selectedSportTypeIds}
        </HelperText>
      )}
      {/* Display general error for loading sport types */}
      {errors._sportTypesLoad && (
        <HelperText
          type="error"
          visible={!!errors._sportTypesLoad}
          style={styles.errorText}
        >
          {errors._sportTypesLoad}
        </HelperText>
      )}
    </View>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    stepTitle: {
      marginBottom: 20,
      fontWeight: "bold",
      fontSize: 18,
      textAlign: "center",
      color: theme.colors.primary,
    },
    label: {
      fontSize: 16,
      marginBottom: 10,
      marginTop: 8,
      fontWeight: "500",
      color: theme.colors.onSurfaceVariant,
    },
    checkboxItem: {
      paddingVertical: 4, // Adjust padding
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.roundness,
      marginBottom: 8,
    },
    loader: {
      marginVertical: 20,
    },
    errorText: {
      fontSize: 14,
    },
  });

export default ChooseSportTypes;
