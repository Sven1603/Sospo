import React, { useState, useMemo } from "react";
import { StyleSheet, ScrollView, Alert, View, Image } from "react-native";
import { Snackbar } from "react-native-paper";
import { supabase } from "../../../lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";

import { uploadClubCoverImage } from "../../../services/clubService";
import { AppTheme, useAppTheme } from "../../../theme/theme";
import StyledTextInput from "../../../components/ui/StyledTextInput";
import StyledText from "../../../components/ui/StyledText";
import StyledButton from "../../../components/ui/StyledButton";
import StyledIconButton from "../../../components/ui/IconButton";
import SportSelector from "../../../components/form/SportSelector";
import PrivacySelector from "../../../components/form/PrivacySelector";
import { ClubPrivacy } from "../../../types/clubTypes";
import LocationPicker, {
  LocationData,
} from "../../../components/form/LocationPicker";

type CreateClubScreenNavigationProp = NativeStackNavigationProp<
  MainAppStackParamList,
  "CreateClub"
>;

type Props = {
  navigation: CreateClubScreenNavigationProp;
};

const privacyOptions = [
  { label: "Public", value: "public", icon: "earth" },
  { label: "Controlled", value: "controlled", icon: "account-eye" },
  // { label: "Private", value: "private", icon: "lock" },
];

const CreateClubScreen = ({ navigation }: Props) => {
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<ClubPrivacy>("public");
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([]);
  const [coverImage, setCoverImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapDerivedAddress, setMapDerivedAddress] = useState<string | null>(
    null
  );
  const [locationText, setLocationText] = useState("");

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const createClubMutation = useMutation({
    mutationFn: async () => {
      // 1. Call RPC to create the club record and get the new club ID
      const { data: newClubId, error: createError } = await supabase.rpc(
        "create_club_and_assign_admin",
        {
          p_name: name,
          p_description: description,
          p_selected_sport_type_ids: selectedSportIds,
          p_privacy: privacy,
          p_latitude: latitude,
          p_longitude: longitude,
          p_map_derived_address: mapDerivedAddress,
          p_location_text: locationText,
          // cover image URL is set in a separate step after we get the clubId
          p_cover_image_url: coverImage
            ? null
            : "https://wjnsiwaxvnavqmzprtzi.supabase.co/storage/v1/object/public/club-images//default-cover.jpg",
        }
      );

      if (createError) throw createError;
      if (!newClubId) throw new Error("Failed to create club: No ID returned.");

      // 2. If an image was selected, upload it now that we have the club ID
      if (coverImage) {
        await uploadClubCoverImage({
          clubId: newClubId,
          file: coverImage,
        });
      }

      return newClubId; // Return the new ID on success
    },
    onSuccess: (newClubId) => {
      // Invalidate queries to refresh club lists
      queryClient.invalidateQueries({ queryKey: ["visibleClubs"] });
      queryClient.invalidateQueries({ queryKey: ["myClubs"] });
      Alert.alert("Success", "Your club has been created!", [
        {
          text: "OK",
          onPress: () =>
            navigation.replace("ClubDetail", { clubId: newClubId }),
        },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert("Error Creating Club", error.message);
      console.error("Error Creating Club", error);
    },
  });

  const handleLocationSelect = (locationData: LocationData) => {
    setLatitude(locationData.latitude);
    setLongitude(locationData.longitude);
    setMapDerivedAddress(locationData.address);
  };

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
      setCoverImage(result.assets[0]);
    }
  };

  const handleCreateClub = () => {
    if (!name.trim() || selectedSportIds.length === 0) {
      Alert.alert(
        "Validation Error",
        "Please provide a club name and select at least one sport."
      );
      return;
    }
    createClubMutation.mutate();
  };

  const handleToggleSportType = (sportId: string) => {
    const newSelection = selectedSportIds.includes(sportId)
      ? selectedSportIds.filter((id) => id !== sportId)
      : [...selectedSportIds, sportId];
    setSelectedSportIds(newSelection);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.imagePreviewContainer}>
        <Image
          source={{
            uri:
              coverImage?.uri ||
              "https://news.sanfordhealth.org/wp-content/uploads/2022/04/Running-Outdoors_SHN-800x600-1.jpg", // TODO: update with AI image
          }}
          style={styles.imagePreview}
        />
        <View style={styles.imageEditIconContainer}>
          <StyledIconButton icon="camera" onPress={handleSelectImage} />
        </View>
      </View>

      <StyledTextInput label="Club Name*" value={name} onChangeText={setName} />
      <StyledTextInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <SportSelector
        selectedSportIds={selectedSportIds}
        onToggleSportType={handleToggleSportType}
        // You can pass a Zod validation error here if you implement it
        // error={errors.selectedSportIds}
      />

      <StyledText variant="titleSmall">Location</StyledText>
      <LocationPicker
        onLocationSelect={handleLocationSelect}
        initialCoordinates={
          latitude && longitude
            ? { latitude: latitude, longitude: longitude }
            : null
        }
      />
      {!latitude ||
        (!longitude && (
          <StyledText color={theme.colors.error}>
            A location selection is required.
          </StyledText>
        ))}

      <StyledTextInput
        label="Optional Location Details"
        placeholder="e.g., 'Meet at the north entrance'"
        value={locationText}
        onChangeText={setLocationText}
      />

      <PrivacySelector
        context="club"
        currentPrivacy={privacy}
        onPrivacyChange={setPrivacy}
        // error={errors.privacy} // Pass Zod error if you add it
      />
      <StyledText>
        Public: anyone can join. Controlled: users must request to join.
      </StyledText>

      <StyledButton
        onPress={handleCreateClub}
        loading={createClubMutation.isPending}
        disabled={createClubMutation.isPending}
      >
        Create Club
      </StyledButton>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 10, // Adjusted padding
      paddingBottom: 40,
      gap: theme.spacing.medium,
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

export default CreateClubScreen;
