// src/screens/App/EditClubScreen.tsx
import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, ScrollView, Alert, Image } from "react-native";
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
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import { supabase } from "../../../lib/supabase";
import StyledIconButton from "../../../components/ui/IconButton";
import * as ImagePicker from "expo-image-picker";
import { AppTheme, useAppTheme } from "../../../theme/theme";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllSportTypes } from "../../../services/sportService";
import {
  fetchClubDetails,
  updateClub,
  uploadClubCoverImage,
} from "../../../services/clubService";
import { ClubPrivacy, UpdateClubPayload } from "../../../types/clubTypes";
import StyledText from "../../../components/ui/StyledText";
import StyledButton from "../../../components/ui/StyledButton";
import StyledTextInput from "../../../components/ui/StyledTextInput";

// Privacy options (can be shared or defined here)
const privacyOptions = [
  { label: "Public", value: "public", icon: "earth" },
  { label: "Controlled", value: "controlled", icon: "account-eye" },
  // { label: "Private", value: "private", icon: "lock" },
];

type Props = NativeStackScreenProps<MainAppStackParamList, "EditClub">;

const EditClubScreen = ({ route, navigation }: Props) => {
  const { clubId } = route.params;
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [privacy, setPrivacy] = useState<ClubPrivacy>("public");
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([]);
  const [newCoverImage, setNewCoverImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  // Fetch initial club data
  const {
    data: club,
    isLoading: isLoadingClub,
    isError,
    error: fetchError,
  } = useQuery({
    queryKey: ["clubDetails", clubId],
    queryFn: () => fetchClubDetails(clubId),
    enabled: !!clubId,
  });

  const { data: sportTypes = [], isLoading: isLoadingSports } = useQuery({
    queryKey: ["sportTypes"],
    queryFn: fetchAllSportTypes,
  });

  useEffect(() => {
    if (club) {
      navigation.setOptions({ title: `Edit: ${club.name}` });
      setName(club.name ?? "");
      setDescription(club.description ?? "");
      setLocation(club.location_text ?? "");
      setPrivacy(club.privacy ?? "public");
      setSelectedSportIds(
        club.club_sport_types?.map((cst) => cst.sport_types!.id) || []
      );
      setNewCoverImage(null);
    }
  }, [club, navigation]);

  // Mutation for saving changes
  const updateClubMutation = useMutation({
    mutationFn: updateClub,
    onSuccess: async () => {
      // If a new image was selected, trigger its upload now
      if (newCoverImage) {
        console.log("New cover image:", newCoverImage);
        await coverImageUploadMutation.mutateAsync({
          clubId,
          file: newCoverImage,
        });
      } else {
        // If no new image, we're done
        // Alert.alert("Success", "Club details have been updated.");
        queryClient.invalidateQueries({ queryKey: ["clubDetails", clubId] });
        queryClient.invalidateQueries({ queryKey: ["visibleClubs"] });
        navigation.goBack();
      }
    },
    onError: (error: Error) =>
      Alert.alert("Error Updating Club", error.message),
  });

  // Mutation for uploading the cover image specifically
  const coverImageUploadMutation = useMutation({
    mutationFn: uploadClubCoverImage,
    onSuccess: () => {
      setNewCoverImage(null);
      // Alert.alert("Success", "Club details and cover image have been updated.");
      queryClient.invalidateQueries({ queryKey: ["clubDetails", clubId] });
      queryClient.invalidateQueries({ queryKey: ["visibleClubs"] });
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert(
        "Image Upload Failed",
        `Club details were saved, but the cover image failed to upload: ${error.message}`
      );
      queryClient.invalidateQueries({ queryKey: ["clubDetails", clubId] });
      queryClient.invalidateQueries({ queryKey: ["visibleClubs"] });
      navigation.goBack();
    },
  });

  const handleSelectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewCoverImage(result.assets[0]);
    }
  };

  const handleSaveChanges = () => {
    if (!name.trim() || selectedSportIds.length === 0) {
      Alert.alert(
        "Validation Error",
        "Please provide a club name and select at least one sport."
      );
      return;
    }

    const payload: UpdateClubPayload = {
      clubId,
      name: name.trim(),
      description: description.trim() || null,
      location_text: location.trim() || null,
      privacy,
      selected_sport_type_ids: selectedSportIds,
      cover_image_url: club?.cover_image_url || null,
    };

    updateClubMutation.mutate(payload);
  };

  if (isLoadingClub) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text>Error loading club data: {fetchError?.message}</Text>
      </View>
    );
  }

  const isSaving =
    updateClubMutation.isPending || coverImageUploadMutation.isPending;
  const currentCoverImageUri =
    newCoverImage?.uri ||
    club?.cover_image_url ||
    "https://news.sanfordhealth.org/wp-content/uploads/2022/04/Running-Outdoors_SHN-800x600-1.jpg"; // TODO: update with AI image

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.imagePreviewContainer}>
        <Image
          source={{ uri: currentCoverImageUri }}
          style={styles.imagePreview}
        />
        <View style={styles.imageEditIconContainer}>
          <StyledIconButton icon="camera" onPress={handleSelectImage} />
        </View>
      </View>

      <StyledTextInput
        label="Club Name"
        value={name}
        onChangeText={setName}
        maxLength={100}
      />

      <StyledTextInput
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <StyledTextInput
        label="Location (e.g., City, Park)"
        value={location}
        onChangeText={setLocation}
      />

      <StyledText variant="titleSmall">Sport Type(s)*</StyledText>
      {isLoadingSports ? (
        <ActivityIndicator />
      ) : (
        sportTypes.map((sport) => (
          <Checkbox.Item
            key={sport.id}
            label={sport.name}
            status={
              selectedSportIds.includes(sport.id) ? "checked" : "unchecked"
            }
            onPress={() => {
              const newSelection = selectedSportIds.includes(sport.id)
                ? selectedSportIds.filter((id) => id !== sport.id)
                : [...selectedSportIds, sport.id];
              setSelectedSportIds(newSelection);
            }}
            position="leading"
          />
        ))
      )}

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

      {updateClubMutation.isError && (
        <StyledText color={theme.colors.error}>
          Something went wrong when saving your changes
        </StyledText>
      )}

      <StyledButton
        onPress={handleSaveChanges}
        loading={isSaving}
        disabled={isSaving}
        icon="content-save-edit-outline"
      >
        {updateClubMutation.isPending ? "Saving Changes..." : "Save Changes"}
      </StyledButton>
    </ScrollView>
  );
};

// Styles can be similar to CreateClubScreen, ensure 'centeredLoader' is defined
const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      paddingBottom: 40,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    title: {
      textAlign: "center",
      marginBottom: 20,
      marginTop: 10,
      fontSize: 20,
    },
    input: { marginBottom: 10 },
    label: { fontSize: 16, marginBottom: 8, marginTop: 12, fontWeight: "600" },
    checkboxItem: { paddingVertical: 0 },
    infoText: { marginBottom: 10 },
    button: { marginTop: 20, paddingVertical: 8 },
    errorText: {
      /* color: theme.colors.error - ensure theme is accessible or use direct color */
    },

    imagePreviewContainer: {
      alignItems: "center",
      marginBottom: 16,
    },
    imagePreview: {
      width: "100%",
      height: 200,
      borderRadius: theme.roundness,
      backgroundColor: theme.colors.surface,
    },
    imageEditIconContainer: {
      position: "absolute",
      bottom: theme.spacing.x_small,
      right: theme.spacing.x_small,
      borderRadius: 20,
      padding: 4,
    },
  });

export default EditClubScreen;
