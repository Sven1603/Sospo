// src/screens/App/ClaimClubScreen.tsx
import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Button,
  TextInput,
  Text,
  HelperText,
  ActivityIndicator,
  Snackbar,
  useTheme,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import { supabase } from "../../../lib/supabase";

type Props = NativeStackScreenProps<MainAppStackParamList, "ClaimClub">;

const ClaimClubScreen = ({ route, navigation }: Props) => {
  const { clubId, clubName } = route.params;
  const theme = useTheme();

  const [claimDetails, setClaimDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const handleSubmitClaim = async () => {
    if (!claimDetails.trim()) {
      setError("Please provide some details for your claim.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated.");
      }

      const { error: insertError } = await supabase
        .from("club_claim_requests")
        .insert({
          club_id: clubId,
          user_id: user.id,
          claim_details: claimDetails.trim(),
          status: "pending", // Default status
        });

      if (insertError) {
        // Check for unique constraint violation (user already claimed this club and it's pending/approved)
        if (
          insertError.message.includes(
            "duplicate key value violates unique constraint"
          )
        ) {
          // This specific unique constraint name might vary or not be present if you didn't add one on (club_id, user_id, status)
          // The RLS policy also prevents duplicate active claims.
          setError(
            "You already have an active claim for this club or your previous claim is still being processed."
          );
          Alert.alert(
            "Claim Submitted Already",
            "You already have an active claim for this club."
          );
        } else {
          throw insertError;
        }
      } else {
        setSnackbarMessage(
          `Claim for "${clubName}" submitted successfully! You will be notified once it's reviewed.`
        );
        setSnackbarVisible(true);
        // Navigate back to club details or club list after a delay
        setTimeout(() => {
          if (navigation.canGoBack()) navigation.goBack();
        }, 3000); // Delay to allow snackbar to be seen
      }
    } catch (e: any) {
      console.error("Error submitting claim:", e);
      setError(
        e.message || "An unexpected error occurred while submitting your claim."
      );
      // Alert.alert('Error', e.message || 'Failed to submit claim.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Claim "{clubName}"
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Please provide details to support your claim for managing this club
        (e.g., your role in the real-world club, contact information, website).
      </Text>

      <TextInput
        label="Claim Details / Justification*"
        value={claimDetails}
        onChangeText={setClaimDetails}
        mode="outlined"
        style={styles.input}
        multiline
        numberOfLines={5}
        maxLength={1000}
      />

      {error && (
        <HelperText type="error" visible={!!error} style={styles.errorText}>
          {error}
        </HelperText>
      )}

      <Button
        mode="contained"
        onPress={handleSubmitClaim}
        loading={loading}
        disabled={loading || !claimDetails.trim()}
        style={styles.button}
        icon="check-decagram-outline"
      >
        {loading ? "Submitting Claim..." : "Submit Claim"}
      </Button>
      <Button
        mode="text"
        onPress={() => navigation.goBack()}
        disabled={loading}
        style={styles.cancelButton}
      >
        Cancel
      </Button>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000} // Longer for important messages
        action={{ label: "OK", onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 14,
    // color: theme.colors.onSurfaceVariant, // Use theme
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
  cancelButton: {
    marginTop: 10,
  },
  errorText: {
    // textAlign: 'center',
  },
});

export default ClaimClubScreen;
