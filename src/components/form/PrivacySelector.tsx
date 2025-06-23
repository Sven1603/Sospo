// src/components/ui/PrivacySelector.tsx
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Text, SegmentedButtons, HelperText } from "react-native-paper";
import { ClubPrivacy } from "../../types/clubTypes"; // Adjust path
import { AppTheme, useAppTheme } from "../../theme/theme";
import StyledText from "../ui/StyledText";

interface PrivacySelectorProps {
  // The type of entity being created/edited, to show relevant options
  context: "club" | "personal_event" | "club_event";
  currentPrivacy: ClubPrivacy;
  onPrivacyChange: (privacy: ClubPrivacy) => void;
  error?: string | null;
}

const PrivacySelector: React.FC<PrivacySelectorProps> = ({
  context,
  currentPrivacy,
  onPrivacyChange,
  error,
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // Define the buttons based on the context
  const privacyOptions = useMemo(() => {
    switch (context) {
      case "club":
        return [
          { value: "public", label: "Public", icon: "earth" },
          {
            value: "controlled",
            label: "Controlled",
            icon: "account-eye-outline",
          },
          // { value: 'private', label: 'Private', icon: 'lock-outline' }, // Can be added later for clubs
        ];
      case "club_event":
        return [
          { value: "public", label: "Public", icon: "earth" },
          {
            value: "controlled",
            label: "Club Members Only",
            icon: "account-group-outline",
          },
          // { value: "private", label: "Invite Only", icon: "lock-outline" },
        ];
      case "personal_event":
      default:
        return [
          { value: "public", label: "Public", icon: "earth" },
          {
            value: "controlled",
            label: "Controlled",
            icon: "account-eye-outline",
          },
          // { value: "private", label: "Invite Only", icon: "lock-outline" },
        ];
    }
  }, [context]);

  return (
    <View style={styles.container}>
      <StyledText variant="titleSmall">Privacy</StyledText>
      <SegmentedButtons
        value={currentPrivacy}
        onValueChange={(value) => onPrivacyChange(value as ClubPrivacy)}
        buttons={privacyOptions}
        style={styles.input}
        density="medium"
      />
      {!!error && <StyledText color={theme.colors.error}>{error}</StyledText>}
    </View>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.small,
    },
    input: {
      marginBottom: 4,
    },
  });

export default PrivacySelector;
