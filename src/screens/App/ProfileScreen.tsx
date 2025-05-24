// src/screens/App/ProfileScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Alert } from "react-native";
import {
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  HelperText,
  Snackbar,
} from "react-native-paper";
import { supabase } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";

const ProfileScreen = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  // const [avatarUrl, setAvatarUrl] = useState(''); // For future use

  const [dbUsername, setDbUsername] = useState<string | null>(null); // To track the username from DB

  const [errorText, setErrorText] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Fetch current user and their profile
  const fetchProfile = useCallback(async (currentUser: User) => {
    setLoadingProfile(true);
    setErrorText("");
    try {
      const { data, error, status } = await supabase
        .from("profiles")
        .select(`username, full_name, avatar_url`)
        .eq("id", currentUser.id)
        .single();

      if (error && status !== 406) {
        // 406 means no rows found, which is an error if profile should exist
        throw error;
      }

      if (data) {
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        // setAvatarUrl(data.avatar_url || '');
        setDbUsername(data.username); // Store the initial username from DB
      } else if (status === 406) {
        // This case should ideally not happen due to our trigger creating a profile.
        // If it does, it means the trigger might have failed or the profile was deleted.
        setErrorText("Profile not found. Please try logging out and in again.");
        Alert.alert(
          "Error",
          "Profile not found. The trigger might have failed. Try logging out and in."
        );
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error.message);
      setErrorText(error.message || "Failed to fetch profile.");
      Alert.alert("Error fetching profile", error.message);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    const getCurrentUserAndProfile = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        await fetchProfile(currentUser);
      } else {
        // Should not happen if user is on this screen, means session error
        setLoadingProfile(false);
        setErrorText("Not authenticated. Please login.");
      }
    };
    getCurrentUserAndProfile();
  }, [fetchProfile]);

  const handleUpdateProfile = async () => {
    if (!user) {
      setErrorText("You are not logged in.");
      setSnackbarMessage("Error: Not authenticated.");
      setSnackbarVisible(true);
      return;
    }

    const trimmedUsername = username.trim();
    // Client-side validation
    if (!trimmedUsername) {
      setErrorText("Username cannot be empty.");
      return;
    }
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      setErrorText("Username must be between 3 and 50 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setErrorText(
        "Username can only contain letters, numbers, and underscores."
      );
      return;
    }

    setSavingProfile(true);
    setErrorText("");

    const profileUpdates = {
      username: trimmedUsername,
      full_name: fullName.trim(),
      // 'updated_at' will be handled by the database trigger, so no need to send it.
      // 'id' is used in the .eq() filter, not in the SET payload for an update.
    };

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", user.id) // Crucial: This targets the update to the logged-in user's profile row
        .select() // Optionally fetch the updated row to confirm changes or use in UI
        .single(); // If you expect only one row to be updated (which you do)

      if (error) {
        // This error object will contain details if the RLS policy fails or other DB errors occur
        throw error;
      }

      // Successfully updated
      if (data) {
        setDbUsername(data.username); // Update the local state for dbUsername if needed
      }
      setSnackbarMessage("Profile updated successfully!");
      setSnackbarVisible(true);
    } catch (error: any) {
      console.error("Error updating profile:", error.message);
      if (
        error.message.includes(
          'duplicate key value violates unique constraint "profiles_username_key"'
        )
      ) {
        setErrorText(
          "This username is already taken. Please choose another one."
        );
      } else if (error.message.includes("violates row-level security policy")) {
        // This is the error you're seeing
        setErrorText(
          "Update failed: Does not meet security policy. (RLS Error)"
        );
        // You could add more specific debugging here, e.g., Alert.alert("RLS Debug", `Is user.id (${user.id}) correct?`);
      } else if (
        error.message.includes('violates check constraint "username_format"')
      ) {
        setErrorText(
          "Username format is invalid. Min 3-50 chars, letters, numbers, underscores."
        );
      } else {
        setErrorText(error.message || "Failed to update profile.");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  if (loadingProfile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{ marginTop: 10 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Edit Profile
      </Text>

      {!dbUsername && ( // Show a prompt if username hasn't been set from DB
        <Text style={styles.noticeText}>
          Please set your unique username to complete your profile.
        </Text>
      )}

      <TextInput
        label="Email"
        value={user?.email || ""}
        disabled // Email is usually not changed here
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        style={styles.input}
        mode="outlined"
        error={!!errorText && errorText.toLowerCase().includes("username")} // Highlight if error is about username
      />
      <HelperText type="info" visible={true} style={styles.infoText}>
        Min 3 chars, letters, numbers, underscores.
      </HelperText>

      <TextInput
        label="Full Name"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
        mode="outlined"
      />

      {/* Placeholder for Avatar URL - we'll implement uploads later
      <TextInput
        label="Avatar URL"
        value={avatarUrl}
        onChangeText={setAvatarUrl}
        style={styles.input}
        mode="outlined"
      />
      */}

      {!!errorText && (
        <HelperText type="error" visible={!!errorText} style={styles.errorText}>
          {errorText}
        </HelperText>
      )}

      <Button
        mode="contained"
        onPress={handleUpdateProfile}
        loading={savingProfile}
        disabled={savingProfile || loadingProfile}
        style={styles.button}
        icon="content-save"
      >
        {savingProfile ? "Saving..." : "Save Profile"}
      </Button>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    marginBottom: 2, // Reduced margin for HelperText
  },
  infoText: {
    marginBottom: 12,
  },
  button: {
    marginTop: 20,
  },
  errorText: {
    // marginBottom: 10, // Handled by HelperText default margins
    // textAlign: 'center',
  },
  noticeText: {
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "bold",
    color: "orange", // Or your theme's notice color
  },
});

export default ProfileScreen;
