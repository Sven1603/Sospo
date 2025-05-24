// src/screens/App/CreateClubScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Button,
  TextInput,
  Text,
  HelperText,
  // RadioButton, // No longer using RadioButton for sport type
  Checkbox, // Using Checkbox for multi-select sport types
  SegmentedButtons,
  ActivityIndicator,
  Snackbar,
  List, // For displaying sport type options
  Divider,
} from "react-native-paper";
import { supabase } from "../../../lib/supabase";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";

type CreateClubScreenNavigationProp = NativeStackNavigationProp<
  MainAppStackParamList,
  "CreateClub"
>;

type Props = {
  navigation: CreateClubScreenNavigationProp;
};

// Type for sport types fetched from DB
type SportType = {
  id: string; // UUID
  name: string;
};

// Privacy options remain the same
const privacyOptions = [
  { label: "Public", value: "public", icon: "earth" },
  { label: "Private", value: "private", icon: "lock" },
  { label: "Controlled", value: "controlled", icon: "account-eye" },
];

const CreateClubScreen = ({ navigation }: Props) => {
  const [clubName, setClubName] = useState("");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private" | "controlled">(
    "public"
  );

  // State for sport types
  const [availableSportTypes, setAvailableSportTypes] = useState<SportType[]>(
    []
  );
  const [selectedSportTypeIds, setSelectedSportTypeIds] = useState<string[]>(
    []
  );
  const [loadingSportTypes, setLoadingSportTypes] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Fetch available sport types on mount
  useEffect(() => {
    const fetchSports = async () => {
      setLoadingSportTypes(true);
      const { data, error: fetchError } = await supabase
        .from("sport_types")
        .select("id, name")
        .order("name", { ascending: true });

      if (fetchError) {
        console.error("Error fetching sport types:", fetchError);
        setError("Could not load sport types. Please try again.");
      } else if (data) {
        setAvailableSportTypes(data as SportType[]);
      }
      setLoadingSportTypes(false);
    };
    fetchSports();
  }, []);

  const handleToggleSportType = (sportTypeId: string) => {
    setSelectedSportTypeIds(
      (prevSelected) =>
        prevSelected.includes(sportTypeId)
          ? prevSelected.filter((id) => id !== sportTypeId) // Remove if already selected
          : [...prevSelected, sportTypeId] // Add if not selected
    );
  };

  const handleCreateClub = async () => {
    if (!clubName.trim()) {
      setError("Club name is required.");
      return;
    }
    if (selectedSportTypeIds.length === 0) {
      setError("At least one sport type must be selected.");
      return;
    }
    // Add other client-side validation as needed

    setLoading(true);
    setError(null);

    try {
      const { data: newClubId, error: rpcError } = await supabase.rpc(
        "create_club_and_assign_admin",
        {
          p_club_name: clubName.trim(),
          p_club_description: description.trim(),
          p_selected_sport_type_ids: selectedSportTypeIds, // Pass array of selected IDs
          p_club_privacy: privacy,
          p_club_location_text: locationText.trim(),
          p_club_cover_image_url: coverImageUrl.trim() || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (newClubId) {
        setSnackbarMessage("Club created successfully!");
        setSnackbarVisible(true);
        // Optionally reset form fields
        setClubName("");
        setDescription("");
        setSelectedSportTypeIds([]);
        // ... reset other fields
        setTimeout(() => navigation.goBack(), 1500); // Go back after showing snackbar
      } else {
        throw new Error("Failed to create club: No ID returned from function.");
      }
    } catch (e: any) {
      console.error("Error creating club:", e);
      setError(
        e.message || "An unexpected error occurred while creating the club."
      );
      // Alert.alert('Error', e.message || 'Failed to create club.'); // Alert can be annoying
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Create a New Club
      </Text>

      <TextInput
        label="Club Name*"
        value={clubName}
        onChangeText={setClubName}
        mode="outlined"
        style={styles.input}
        maxLength={100}
      />

      <TextInput
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        style={styles.input}
        multiline
        numberOfLines={3}
      />

      <TextInput
        label="Location (e.g., City, Park)"
        value={locationText}
        onChangeText={setLocationText}
        mode="outlined"
        style={styles.input}
      />

      <Text style={styles.label}>Sport Type(s)*</Text>
      {loadingSportTypes ? (
        <ActivityIndicator animating={true} style={styles.input} />
      ) : availableSportTypes.length > 0 ? (
        availableSportTypes.map((sport) => (
          <Checkbox.Item
            key={sport.id}
            label={sport.name}
            status={
              selectedSportTypeIds.includes(sport.id) ? "checked" : "unchecked"
            }
            onPress={() => handleToggleSportType(sport.id)}
            position="leading" // Puts checkbox before label
            labelStyle={styles.checkboxLabel}
            style={styles.checkboxItem}
          />
        ))
      ) : (
        <Text style={styles.input}>
          No sport types available. Please contact support.
        </Text>
      )}
      <HelperText type="info" visible={true} style={styles.infoText}>
        Select at least one sport.
      </HelperText>

      <Text style={styles.label}>Privacy Setting*</Text>
      <SegmentedButtons
        value={privacy}
        onValueChange={(value) =>
          setPrivacy(value as "public" | "private" | "controlled")
        }
        buttons={privacyOptions}
        style={styles.input}
      />

      <TextInput
        label="Cover Image URL (optional)"
        value={coverImageUrl}
        onChangeText={setCoverImageUrl}
        mode="outlined"
        style={styles.input}
        keyboardType="url"
      />

      {error && (
        <HelperText type="error" visible={!!error} style={styles.errorText}>
          {error}
        </HelperText>
      )}

      <Button
        mode="contained"
        onPress={handleCreateClub}
        loading={loading}
        disabled={loading || loadingSportTypes}
        style={styles.button}
        icon="plus-circle-outline"
      >
        {loading ? "Creating Club..." : "Create Club"}
      </Button>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: "OK",
          onPress: () => {
            setSnackbarVisible(false);
          },
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10, // Adjusted padding
    paddingBottom: 40,
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  input: {
    marginBottom: 10, // Adjusted margin
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    marginTop: 12, // Adjusted margin
    fontWeight: "600", // Make label slightly bolder
    // color: theme.colors.onSurfaceVariant, // Example for theme usage
  },
  checkboxItem: {
    // Style for the individual Checkbox.Item container if needed
    // e.g., backgroundColor: '#f0f0f0', borderRadius: 4, marginBottom: 2
    paddingVertical: 0, // Reduce default padding of Checkbox.Item
  },
  checkboxLabel: {
    // Style for the label text of Checkbox.Item
    // e.g., color: 'black'
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
  errorText: {
    // textAlign: 'center', // Center error text if preferred
  },
  infoText: {
    // Helper text for sport types
    marginBottom: 10,
  },
});

export default CreateClubScreen;
