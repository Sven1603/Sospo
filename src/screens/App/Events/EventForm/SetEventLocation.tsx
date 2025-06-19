// src/screens/App/Events/EventForm/SetEventLocation.tsx
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import {
  Text,
  TextInput,
  HelperText,
  Title,
  useTheme,
  Caption,
} from "react-native-paper";
import type { MD3Theme } from "react-native-paper";

import { EventFormData } from "./eventForm.types";
import LocationPicker, {
  LocationData,
} from "../../../../components/form/LocationPicker";
import { AppTheme, useAppTheme } from "../../../../theme/theme";

interface SetEventLocationProps {
  formData: Pick<
    EventFormData,
    "latitude" | "longitude" | "map_derived_address" | "locationText"
  >;
  handleChange: (field: keyof EventFormData, value: any) => void;
  errors: Partial<
    Record<"latitude" | "longitude" | "locationText", string | null | undefined>
  >;
}

const SetEventLocation: React.FC<SetEventLocationProps> = ({
  formData,
  handleChange,
  errors,
}) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const handleLocationSelect = (locationData: LocationData) => {
    handleChange("latitude", locationData.latitude);
    handleChange("longitude", locationData.longitude);
    handleChange("map_derived_address", locationData.address);
  };

  return (
    <View>
      <Title style={styles.stepTitle}>Step 2: Event Location</Title>

      <Text style={styles.label}>Select the event location on the map*:</Text>
      <LocationPicker
        onLocationSelect={handleLocationSelect}
        initialCoordinates={
          formData.latitude && formData.longitude
            ? { latitude: formData.latitude, longitude: formData.longitude }
            : null
        }
      />
      {(errors.latitude || errors.longitude) && (
        <HelperText type="error" visible={true}>
          {errors.latitude ||
            errors.longitude ||
            "Please select a location on the map."}
        </HelperText>
      )}

      <Text style={styles.label}>Location Details / Landmark (Optional)</Text>
      <TextInput
        label="E.g., 'Meet by the main fountain', 'Entrance B'"
        value={formData.locationText}
        onChangeText={(text) => handleChange("locationText", text)}
        mode="outlined"
        style={styles.input}
        maxLength={255}
        multiline
        numberOfLines={2}
        error={!!errors.locationText}
      />
      {errors.locationText && (
        <HelperText type="error" visible={!!errors.locationText}>
          {errors.locationText}
        </HelperText>
      )}
      <Caption style={styles.caption}>
        Add any specific details about the location or meeting point.
      </Caption>
    </View>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    stepTitle: {
      marginBottom: 16,
      fontWeight: "bold",
      fontSize: 18,
      textAlign: "center",
      color: theme.colors.primary,
    },
    input: { marginBottom: 4 },
    label: {
      fontSize: 16,
      marginBottom: 8,
      marginTop: 12,
      fontWeight: "500",
      color: theme.colors.onSurfaceVariant,
    },
    caption: {
      marginBottom: 16,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
  });

export default SetEventLocation;
