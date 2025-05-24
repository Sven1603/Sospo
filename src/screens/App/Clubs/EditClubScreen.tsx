// src/screens/App/EditClubScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Button,
  TextInput,
  Text,
  HelperText,
  Checkbox,
  SegmentedButtons,
  ActivityIndicator,
  Snackbar,
  useTheme,
  Title,
  Divider, // Added Title for consistency
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types"; // Ensure this path is correct
import { supabase } from "../../../lib/supabase"; // Ensure this path is correct

// Type for sport types fetched from DB (can be shared or defined here)
type SportType = {
  id: string; // UUID
  name: string;
};

// Privacy options (can be shared or defined here)
const privacyOptions = [
  { label: "Public", value: "public", icon: "earth" },
  { label: "Private", value: "private", icon: "lock" },
  { label: "Controlled", value: "controlled", icon: "account-eye" },
];

type Props = NativeStackScreenProps<MainAppStackParamList, "EditClub">;

const EditClubScreen = ({ route, navigation }: Props) => {
  const { clubId } = route.params;
  const theme = useTheme();

  // Form state
  const [clubName, setClubName] = useState("");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private" | "controlled">(
    "public"
  );
  const [selectedSportTypeIds, setSelectedSportTypeIds] = useState<string[]>(
    []
  );

  // Data fetching and loading states
  const [availableSportTypes, setAvailableSportTypes] = useState<SportType[]>(
    []
  );
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Fetch all available sport types (for the selector)
  useEffect(() => {
    const fetchAllSportTypes = async () => {
      const { data, error: fetchError } = await supabase
        .from("sport_types")
        .select("id, name")
        .order("name", { ascending: true });

      if (fetchError) {
        console.error("Error fetching all sport types:", fetchError);
        setError("Could not load sport type options."); // Show error related to sport types loading
      } else if (data) {
        setAvailableSportTypes(data as SportType[]);
      }
    };
    fetchAllSportTypes();
  }, []);

  // Fetch existing club data to pre-fill the form
  useEffect(() => {
    if (!clubId) {
      setError("No Club ID provided for editing.");
      setLoadingInitialData(false);
      navigation.setOptions({ title: "Error - No Club ID" });
      return;
    }

    const fetchClubToEdit = async () => {
      setLoadingInitialData(true);
      setError(null); // Clear previous errors
      try {
        const { data, error: clubError } = await supabase
          .from("clubs")
          .select(
            `
            name,
            description,
            privacy,
            location_text,
            cover_image_url,
            club_sport_types ( sport_types ( id ) )
          `
          )
          .eq("id", clubId)
          .single();

        if (clubError) throw clubError;

        if (data) {
          navigation.setOptions({ title: `Edit "${data.name}"` }); // Set screen title
          setClubName(data.name || "");
          setDescription(data.description || "");
          setPrivacy(data.privacy as "public" | "private" | "controlled");
          setLocationText(data.location_text || "");
          setCoverImageUrl(data.cover_image_url || "");

          const currentSportTypeIds = (data.club_sport_types || [])
            .map((cst: any) => {
              // Handle if cst.sport_types is an object or array (based on previous TS fixes)
              const sportTypeData = cst.sport_types;
              if (Array.isArray(sportTypeData) && sportTypeData.length > 0) {
                return sportTypeData[0]?.id;
              } else if (sportTypeData && !Array.isArray(sportTypeData)) {
                return (sportTypeData as SportType)?.id;
              }
              return null;
            })
            .filter(Boolean) as string[];
          setSelectedSportTypeIds(currentSportTypeIds);
        } else {
          setError("Club not found or you do not have permission to edit it.");
          Alert.alert("Error", "Club not found or access denied.");
          navigation.goBack();
        }
      } catch (e: any) {
        console.error("Error fetching club to edit:", e);
        setError(e.message || "Failed to load club data for editing.");
        Alert.alert("Error", "Failed to load club data.");
      } finally {
        setLoadingInitialData(false);
      }
    };
    fetchClubToEdit();
  }, [clubId, navigation]);

  const handleToggleSportType = (sportTypeId: string) => {
    setSelectedSportTypeIds((prevSelected) =>
      prevSelected.includes(sportTypeId)
        ? prevSelected.filter((id) => id !== sportTypeId)
        : [...prevSelected, sportTypeId]
    );
  };

  const handleUpdateClub = async () => {
    if (!clubName.trim()) {
      setError("Club name is required.");
      return;
    }
    if (selectedSportTypeIds.length === 0) {
      setError("At least one sport type must be selected.");
      return;
    }
    // Add other client-side validation as needed

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc(
        "update_club_details_and_sports",
        {
          p_club_id: clubId,
          p_club_name: clubName.trim(),
          p_club_description: description.trim(),
          p_new_selected_sport_type_ids: selectedSportTypeIds,
          p_club_privacy: privacy,
          p_club_location_text: locationText.trim(),
          p_club_cover_image_url: coverImageUrl.trim() || null,
        }
      );

      if (rpcError) {
        console.error("RPC Error updating club:", rpcError);
        // Check for specific RLS violation messages (PostgreSQL raises specific error codes/messages)
        if (
          rpcError.message.includes(
            "Only the club owner or an admin can change the privacy setting"
          )
        ) {
          setError(
            "Failed to update: Only the club owner or an admin can change the privacy setting."
          );
        } else if (
          rpcError.message.includes("Club owner (created_by) cannot be changed")
        ) {
          setError(
            "Failed to update: Club owner field cannot be changed here."
          );
        } else if (
          rpcError.message.includes("violates row-level security policy") ||
          rpcError.message.includes("permission denied")
        ) {
          setError(
            "Update failed: You may not have permission to perform this update or change certain fields."
          );
        } else {
          throw rpcError; // Re-throw other RPC errors
        }
      } else {
        setSnackbarMessage("Club updated successfully!");
        setSnackbarVisible(true);
        // Navigate back to club details, which should re-fetch.
        // Or, if ClubDetailScreen subscribes to changes, it might update automatically.
        // For now, navigating back is simplest.
        setTimeout(() => {
          if (navigation.canGoBack()) navigation.goBack();
        }, 1500);
      }
    } catch (e: any) {
      console.error("General error updating club:", e);
      setError(
        e.message || "An unexpected error occurred while updating the club."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitialData) {
    return (
      <View style={styles.centeredLoader}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{ marginTop: 10 }}>Loading club data for editing...</Text>
      </View>
    );
  }

  // If initial load failed badly (e.g., club not found) and error is set
  if (error && !clubName && !description) {
    // Heuristic: if form fields are still empty and error exists
    return (
      <View style={styles.centeredLoader}>
        <Text
          style={{
            color: theme.colors.error,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          {error}
        </Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>Edit "{clubName || "Club"}"</Title>

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
      {availableSportTypes.length > 0 ? (
        availableSportTypes.map((sport) => (
          <Checkbox.Item
            key={sport.id}
            label={sport.name}
            status={
              selectedSportTypeIds.includes(sport.id) ? "checked" : "unchecked"
            }
            onPress={() => handleToggleSportType(sport.id)}
            position="leading"
            style={styles.checkboxItem}
          />
        ))
      ) : (
        <Text style={styles.input}>Loading sport types...</Text>
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
        // Note: UI doesn't yet disable this for contributors. RLS/trigger handles backend enforcement.
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
        onPress={handleUpdateClub}
        loading={isSubmitting}
        disabled={isSubmitting || loadingInitialData}
        style={styles.button}
        icon="content-save-edit-outline"
      >
        {isSubmitting ? "Saving Changes..." : "Save Changes"}
      </Button>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{ label: "OK", onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

// Styles can be similar to CreateClubScreen, ensure 'centeredLoader' is defined
const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 10, paddingBottom: 40 },
  centeredLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: { textAlign: "center", marginBottom: 20, marginTop: 10, fontSize: 20 },
  input: { marginBottom: 10 },
  label: { fontSize: 16, marginBottom: 8, marginTop: 12, fontWeight: "600" },
  checkboxItem: { paddingVertical: 0 },
  infoText: { marginBottom: 10 },
  button: { marginTop: 20, paddingVertical: 8 },
  errorText: {
    /* color: theme.colors.error - ensure theme is accessible or use direct color */
  },
});

export default EditClubScreen;
