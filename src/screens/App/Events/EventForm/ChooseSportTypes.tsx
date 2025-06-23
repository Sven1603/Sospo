// src/screens/App/CreateEventForm/ChooseSportTypes.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { SportType } from "./eventForm.types";
import { SUPPORTED_SPORTS } from "../../../../utils/constants";
import StyledText from "../../../../components/ui/StyledText";
import { AppTheme, useAppTheme } from "../../../../theme/theme";
import SportSelector from "../../../../components/form/SportSelector";

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
}

const ChooseSportTypes: React.FC<ChooseSportTypesProps> = ({
  selectedSportTypeIds,
  onToggleSportType,
  availableSportTypes,
  loadingSportTypes,
  errors,
}) => {
  const theme = useAppTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  // Filter available sports to only show the MVP ones, but ensure they exist
  const displayableSportTypes = availableSportTypes.filter((sport) =>
    SUPPORTED_SPORTS.includes(sport.name.toLowerCase())
  );

  if (loadingSportTypes) {
    return (
      <ActivityIndicator animating={true} size="large" style={styles.loader} />
    );
  }

  return (
    <View style={styles.container}>
      <StyledText variant="titleMedium">
        Step 1: Choose Sport Type(s)
      </StyledText>
      <SportSelector
        selectedSportIds={selectedSportTypeIds}
        onToggleSportType={onToggleSportType}
        // You can pass a Zod validation error here if you implement it
        // error={errors.selectedSportIds}
      />
    </View>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.medium,
    },
    loader: {
      marginVertical: 20,
    },
  });

export default ChooseSportTypes;
