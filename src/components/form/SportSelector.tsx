// src/components/ui/SportSelector.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Checkbox, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { fetchAllSportTypes } from "../../services/sportService";
import { SportTypeStub } from "../../types/commonTypes";
import { AppTheme, useAppTheme } from "../../theme/theme";
import StyledText from "../ui/StyledText";
import StyledButton from "../ui/StyledButton";
import { SUPPORTED_SPORTS } from "../../utils/constants";

interface SportSelectorProps {
  selectedSportIds: string[];
  onToggleSportType: (sportId: string) => void;
  error?: string | null;
}

const SportSelector: React.FC<SportSelectorProps> = ({
  selectedSportIds,
  onToggleSportType,
  error,
}) => {
  const theme = useAppTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const {
    data: sportTypes = [],
    isLoading,
    isError,
    error: fetchError,
    refetch,
  } = useQuery<SportTypeStub[], Error>({
    queryKey: ["allSportTypes"],
    queryFn: fetchAllSportTypes,
  });

  const activeSportTypes = sportTypes.filter((sport) =>
    SUPPORTED_SPORTS.includes(sport.name.toLowerCase())
  );

  if (isLoading) {
    return <ActivityIndicator style={{ marginVertical: 20 }} />;
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <StyledText color={theme.colors.error}>
          Could not load sports: {fetchError?.message}
        </StyledText>
        <StyledButton variant="outline" onPress={() => refetch()}>
          Try Again
        </StyledButton>
      </View>
    );
  }

  return (
    <View>
      <StyledText variant="titleSmall" mb={theme.spacing.small}>
        Sport Type(s)
      </StyledText>
      {activeSportTypes.map((sport) => (
        <Checkbox.Item
          key={sport.id}
          label={sport.name}
          status={selectedSportIds.includes(sport.id) ? "checked" : "unchecked"}
          onPress={() => onToggleSportType(sport.id)}
          style={styles.checkboxItem}
          labelStyle={{ color: theme.colors.onSurface }}
        />
      ))}
      {!!error && <StyledText color={theme.colors.error}>{error}</StyledText>}
    </View>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    checkboxItem: {
      paddingVertical: theme.spacing.x_small,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.roundness,
      marginBottom: 8,
    },
    centered: {
      height: 100,
      justifyContent: "center",
      alignItems: "center",
    },
  });

export default SportSelector;
