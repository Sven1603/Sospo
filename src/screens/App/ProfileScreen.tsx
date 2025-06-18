// src/screens/App/ProfileScreen.tsx
import React, { useState, useEffect, useMemo, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  TextInput,
  Snackbar,
  ActivityIndicator,
  Avatar,
  IconButton,
  Divider,
} from "react-native-paper";
import { supabase } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useAppTheme, AppTheme } from "../../theme/theme";
import StyledText from "../../components/ui/StyledText";
import StyledButton from "../../components/ui/StyledButton";

// TanStack Query & Service Imports
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserProfile,
  updateUserProfile,
  uploadProfileAvatar,
} from "../../services/profileService";
import type { UserProfile } from "../../types/userTypes";

// Navigation Imports
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../navigation/types";

// Image Picker Import
import * as ImagePicker from "expo-image-picker";
import StyledTextInput from "../../components/ui/StyledTextInput";
import StyledIconButton from "../../components/ui/IconButton";
import { ADMIN_USER_ID } from "../../utils/constants";

type Props = NativeStackScreenProps<MainAppStackParamList, "Profile">;

const ProfileScreen = ({ navigation }: Props) => {
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const queryClient = useQueryClient();

  const [authUser, setAuthUser] = useState<User | null>(null);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [aboutMe, setAboutMe] = useState("");

  const [errorText, setErrorText] = useState("");

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  useEffect(() => {
    const getAuthUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAuthUser(user);
    };
    getAuthUser();
  }, []);

  // Set header options dynamically
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="logout"
          size={26}
          onPress={handleLogout}
          iconColor={theme.colors.onBackground}
        />
      ),
    });
  }, [navigation]);

  // Fetch profile data using TanStack Query
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError,
    error: fetchError,
  } = useQuery<UserProfile | null, Error>({
    queryKey: ["userProfile", authUser?.id],
    queryFn: () =>
      authUser ? fetchUserProfile(authUser.id) : Promise.resolve(null),
    enabled: !!authUser, // Only run the query when we have an authenticated user
  });

  // Effect to sync fetched data into local form state
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setFullName(profile.full_name || "");
      setAboutMe(profile.about_me || "");
    }
  }, [profile]);

  // Mutation for updating profile text fields
  const updateProfileMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      setSnackbarMessage("Profile updated successfully!");
      setSnackbarVisible(true);
      queryClient.invalidateQueries({
        queryKey: ["userProfile", authUser?.id],
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate key")) {
        setErrorText(
          "This username is already taken. Please choose another one."
        );
      } else {
        setErrorText(error.message || "Failed to update profile.");
      }
    },
  });

  // Mutation for uploading avatar
  const avatarUploadMutation = useMutation({
    mutationFn: uploadProfileAvatar,
    onSuccess: (newAvatarUrl) => {
      setSnackbarMessage("Profile picture updated!");
      setSnackbarVisible(true);
      // Invalidate the query to refetch and show the new image
      queryClient.invalidateQueries({
        queryKey: ["userProfile", authUser?.id],
      });
    },
    onError: (error: Error) => {
      Alert.alert("Upload Failed", error.message);
    },
  });

  const handleSelectAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to change your avatar."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && authUser) {
      avatarUploadMutation.mutate({
        userId: authUser.id,
        file: result.assets[0],
      });
    }
  };

  const handleUpdateProfile = () => {
    if (!authUser) return;
    // Client-side validation
    if (!username.trim() || username.trim().length < 3) {
      setErrorText("Username must be at least 3 characters long.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setErrorText(
        "Username can only contain letters, numbers, and underscores."
      );
      return;
    }
    setErrorText("");
    updateProfileMutation.mutate({
      id: authUser.id,
      username: username.trim(),
      full_name: fullName.trim() || null,
      about_me: aboutMe.trim() || null,
    });
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "No", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => await supabase.auth.signOut(),
        style: "default",
      },
    ]);
  };

  // Might add this later
  // const handleCreatePersonalEvent = () => {
  //   navigation.navigate("EventWizardScreen", {
  //     clubId: undefined,
  //     clubName: undefined,
  //   });
  // };

  if (isLoadingProfile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StyledText>Error loading profile: {fetchError?.message}</StyledText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            onPress={handleSelectAvatar}
            disabled={avatarUploadMutation.isPending}
          >
            <Avatar.Image
              size={100}
              source={{
                uri: profile?.avatar_url ?? "",
              }}
              style={{ backgroundColor: theme.colors.surface }}
            />
            <View style={styles.avatarEditIconContainer}>
              <StyledIconButton icon="camera-plus" />
            </View>
            {avatarUploadMutation.isPending && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator color={theme.colors.onPrimary} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <StyledTextInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          error={!!errorText && errorText.toLowerCase().includes("username")}
        />
        <StyledTextInput
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
        />
        <StyledTextInput
          label="About Me (Optional)"
          value={aboutMe}
          onChangeText={setAboutMe}
          mode="outlined"
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        {!!errorText && (
          <StyledText color={theme.colors.error}>{errorText}</StyledText>
        )}

        <StyledButton
          onPress={handleUpdateProfile}
          loading={updateProfileMutation.isPending}
          disabled={
            updateProfileMutation.isPending || avatarUploadMutation.isPending
          }
          icon="content-save"
          style={{ marginTop: 10 }}
        >
          {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
        </StyledButton>

        {authUser?.id === ADMIN_USER_ID && (
          <>
            <Divider style={{ marginVertical: 20 }} />
            <StyledButton
              onPress={() => navigation.navigate("ManageClubClaims")}
              icon="shield-crown-outline"
              mode="elevated"
            >
              Admin Panel
            </StyledButton>
          </>
        )}

        {/* Might add this later
      <StyledButton
        onPress={handleCreatePersonalEvent}
        icon="calendar-plus"
        mode="contained-tonal"
      >
        Create Personal Event
      </StyledButton> */}
      </View>

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
    container: { flex: 1, padding: 20 },
    centered: {
      justifyContent: "center",
      alignItems: "center",
    },
    content: { gap: theme.spacing.medium },
    avatarContainer: { alignItems: "center", marginVertical: 20 },
    avatarEditIconContainer: {
      position: "absolute",
      bottom: -theme.spacing.medium,
      right: -theme.spacing.medium,
      borderRadius: 20,
      padding: 4,
    },
    avatarLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 50,
    },
  });

export default ProfileScreen;
