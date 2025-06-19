// src/components/form/LocationPicker.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import MapView, { Marker, MapPressEvent, LatLng } from "react-native-maps";
import * as Location from "expo-location";
import { AppTheme, useAppTheme } from "../../theme/theme";
import { AMSTERDAM_COORDS } from "../../utils/constants";

// Type for the data this component will return on selection
export interface LocationData {
  latitude: number;
  longitude: number;
  address: string | null;
}

interface LocationPickerProps {
  // To pre-fill the map if editing an existing location
  initialCoordinates?: {
    latitude: number;
    longitude: number;
  } | null;
  // Callback function to pass the selected location data back to the parent form
  onLocationSelect: (locationData: LocationData) => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  initialCoordinates,
  onLocationSelect,
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const mapRef = useRef<MapView>(null);

  const [selectedCoords, setSelectedCoords] = useState<LatLng | null>(
    initialCoordinates || null
  );
  const [displayAddress, setDisplayAddress] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    // If initial coordinates are provided, perform an initial geocode
    if (initialCoordinates && !displayAddress) {
      handleNewCoordinatesSelected(initialCoordinates, false); // false = don't animate on initial load
    }
  }, [initialCoordinates]);

  const handleNewCoordinatesSelected = async (
    coords: LatLng,
    shouldAnimate = true
  ) => {
    setSelectedCoords(coords);

    // Animate map to the new coordinate
    if (shouldAnimate && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        300
      );
    }

    setIsGeocoding(true);
    setDisplayAddress("Fetching address...");
    try {
      const addressResult = await Location.reverseGeocodeAsync(coords);
      let formattedAddress: string | null = "Address not found.";
      if (addressResult && addressResult.length > 0) {
        const { street, streetNumber, city } = addressResult[0];
        formattedAddress = [streetNumber, street, city]
          .filter(Boolean)
          .join(", ");
      }
      setDisplayAddress(formattedAddress);
      // Use the callback to pass all location data to the parent form
      onLocationSelect({ ...coords, address: formattedAddress });
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      setDisplayAddress("Could not fetch address.");
      onLocationSelect({ ...coords, address: "Could not fetch address." });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMapPress = (e: MapPressEvent) => {
    handleNewCoordinatesSelected(e.nativeEvent.coordinate);
  };

  return (
    <View>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={
            initialCoordinates
              ? {
                  ...initialCoordinates,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              : AMSTERDAM_COORDS
          }
          onPress={handleMapPress}
        >
          {selectedCoords && <Marker coordinate={selectedCoords} />}
        </MapView>
      </View>
      <View style={styles.addressContainer}>
        {isGeocoding ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text style={styles.addressText}>
            {displayAddress || "Tap map to select a location"}
          </Text>
        )}
      </View>
    </View>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    mapContainer: {
      height: 300,
      width: "100%",
      marginVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      borderRadius: theme.roundness,
      overflow: "hidden",
    },
    map: { flex: 1 },
    addressContainer: {
      paddingVertical: 8,
      minHeight: 40,
    },
    addressText: {
      fontStyle: "italic",
      color: theme.colors.onSurfaceVariant,
    },
  });

export default LocationPicker;
