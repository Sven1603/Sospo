// src/screens/App/CreateEventForm/SetEventLocation.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Alert, Platform } from "react-native";
import {
  Text,
  TextInput,
  HelperText,
  Title,
  useTheme,
  Caption,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import type { MD3Theme } from "react-native-paper";
import MapView, {
  Marker,
  Region,
  MapPressEvent,
  LatLng,
  MarkerDragStartEndEvent,
} from "react-native-maps"; // Import MapView and Marker
import * as Location from "expo-location"; // For reverse geocoding

import { EventFormData } from "./eventForm.types";

interface SetEventLocationProps {
  formData: Pick<
    EventFormData,
    "latitude" | "longitude" | "map_derived_address" | "locationText"
  >;
  handleChange: (field: keyof EventFormData, value: any) => void;
  errors: Partial<
    Record<"latitude" | "longitude" | "locationText", string | null | undefined>
  >;
  theme: MD3Theme;
}

// Amsterdam Coordinates for initial region
const AMSTERDAM_COORDS = {
  latitude: 52.3676,
  longitude: 4.9041,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const SetEventLocation: React.FC<SetEventLocationProps> = ({
  formData,
  handleChange,
  errors,
  theme,
}) => {
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const mapRef = useRef<MapView>(null);

  const [selectedCoords, setSelectedCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    formData.latitude && formData.longitude
      ? { latitude: formData.latitude, longitude: formData.longitude }
      : null
  );
  const [displayAddress, setDisplayAddress] = useState<string | null>(
    formData.map_derived_address
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentMapRegion, setCurrentMapRegion] = useState<Region | undefined>(
    formData.latitude && formData.longitude
      ? {
          latitude: formData.latitude,
          longitude: formData.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : AMSTERDAM_COORDS
  );

  useEffect(() => {
    if (formData.latitude && formData.longitude) {
      const newCoords = {
        latitude: formData.latitude,
        longitude: formData.longitude,
      };
      if (
        !selectedCoords ||
        selectedCoords.latitude !== newCoords.latitude ||
        selectedCoords.longitude !== newCoords.longitude
      ) {
        setSelectedCoords(newCoords);
        const newRegion = {
          ...AMSTERDAM_COORDS,
          ...(currentMapRegion || {}),
          latitude: newCoords.latitude,
          longitude: newCoords.longitude,
        };
        setCurrentMapRegion(newRegion);
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 300);
        }
      }
      if (formData.map_derived_address !== displayAddress) {
        setDisplayAddress(formData.map_derived_address);
      }
    } else {
      setSelectedCoords(null);
    }
  }, [formData.latitude, formData.longitude, formData.map_derived_address]);

  const handleNewCoordinatesSelected = useCallback(
    async (coords: LatLng) => {
      const { latitude, longitude } = coords;

      setSelectedCoords({ latitude, longitude }); // Update local marker state
      handleChange("latitude", latitude); // Update parent formData
      handleChange("longitude", longitude); // Update parent formData

      // Animate map to the new coordinate
      if (mapRef.current) {
        const regionToAnimate = {
          latitude,
          longitude,
          latitudeDelta: currentMapRegion?.latitudeDelta || 0.01, // Use current zoom or a default
          longitudeDelta: currentMapRegion?.longitudeDelta || 0.01,
        };
        mapRef.current.animateToRegion(regionToAnimate, 300);
      }

      setIsGeocoding(true);
      handleChange("map_derived_address", "Fetching address...");
      try {
        const addressResult = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (addressResult && addressResult.length > 0) {
          const {
            street,
            streetNumber,
            city,
            postalCode,
            district,
            region,
            subregion,
            country,
          } = addressResult[0];
          const formattedAddress = [
            streetNumber,
            street,
            district,
            city,
            postalCode,
            subregion,
            region,
            country,
          ]
            .filter(Boolean)
            .join(", ");
          setDisplayAddress(formattedAddress);
          handleChange("map_derived_address", formattedAddress);
        } else {
          setDisplayAddress("Address not found for these coordinates.");
          handleChange("map_derived_address", "Address not found");
        }
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        setDisplayAddress("Could not fetch address.");
        handleChange("map_derived_address", "Could not fetch address");
      } finally {
        setIsGeocoding(false);
      }
    },
    [handleChange, currentMapRegion]
  ); // Include currentMapRegion in dependencies

  const handleMapPress = (e: MapPressEvent) => {
    handleNewCoordinatesSelected(e.nativeEvent.coordinate);
  };

  const handleMarkerDragEnd = (e: MarkerDragStartEndEvent) => {
    handleNewCoordinatesSelected(e.nativeEvent.coordinate);
  };

  const onRegionChangeComplete = (region: Region) => {
    setCurrentMapRegion(region);
  };

  return (
    <View>
      <Title style={styles.stepTitle}>Step 2: Event Location</Title>
      <Text style={styles.label}>
        Tap on the map to set the event location:*
      </Text>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={currentMapRegion || AMSTERDAM_COORDS}
          onPress={handleMapPress}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation={false} // For MVP, not focusing on user's current location
        >
          {selectedCoords && (
            <Marker
              key={
                selectedCoords
                  ? `${selectedCoords.latitude}-${selectedCoords.longitude}`
                  : "marker"
              }
              coordinate={selectedCoords}
              title="Event Location"
              draggable
              onDragEnd={handleMarkerDragEnd}
            />
          )}
        </MapView>
      </View>

      {(isGeocoding || displayAddress) && (
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.label}>Selected Location Address:</Text>
          {isGeocoding ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={styles.addressText}>
              {displayAddress || "Tap map to select"}
            </Text>
          )}
        </View>
      )}
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

export default SetEventLocation;

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    stepTitle: {
      marginBottom: 16,
      fontWeight: "bold",
      fontSize: 18,
      textAlign: "center",
      color: theme.colors.primary,
    },
    mapContainer: {
      height: Platform.OS === "web" ? 400 : 300, // Adjust height as needed
      width: "100%",
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      borderRadius: theme.roundness,
    },
    map: { flex: 1 },
    addressText: {
      fontSize: 16,
      marginBottom: 8,
      fontStyle: "italic",
      color: theme.colors.onSurfaceVariant,
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
    loadingContainer: { alignItems: "center", marginVertical: 10 },
  });
