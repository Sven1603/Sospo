// src/screens/App/RespondToAdminTransferScreen.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Text,
  Button,
  ActivityIndicator,
  Snackbar,
  useTheme,
  Card,
  Title,
  Paragraph,
  Divider,
  HelperText,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types"; // Adjust path if needed
import { supabase } from "../../../lib/supabase"; // Adjust path if needed

type Props = NativeStackScreenProps<
  MainAppStackParamList,
  "RespondToAdminTransferScreen"
>;

const RespondToAdminTransferScreen = ({ route, navigation }: Props) => {
  const {
    transferRequestId,
    clubName,
    currentAdminUsername,
    newRoleForCurrentAdmin,
  } = route.params;
  const theme = useTheme();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [currentUserAuthId, setCurrentUserAuthId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserAuthId(user.id);
      else {
        setError("User not authenticated. Please login again.");
        // Optionally navigate away if no user
      }
    };
    getUserId();
  }, []);

  const handleRespondToTransfer = async (
    decision: "approved_by_new_admin" | "rejected_by_new_admin"
  ) => {
    if (!currentUserAuthId) {
      Alert.alert("Error", "Could not verify your identity. Please try again.");
      return;
    }
    if (!transferRequestId) {
      Alert.alert("Error", "Transfer request ID is missing.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("club_admin_transfer_requests")
        .update({
          status: decision,
          reviewed_at: new Date().toISOString(),
          // The reviewer_id is implicitly the current user (proposed_new_admin_user_id)
          // RLS policy `WITH CHECK (auth.uid() = proposed_new_admin_user_id)` ensures this.
          // The trigger `process_admin_transfer_decision` also checks `auth.uid()` vs `proposed_new_admin_user_id`
        })
        .eq("id", transferRequestId)
        .eq("proposed_new_admin_user_id", currentUserAuthId) // Ensure user is updating their own request
        .eq("status", "pending_new_admin_approval"); // Ensure request is still pending

      if (updateError) {
        // Check for specific errors from RLS or trigger
        if (updateError.message.includes("AUTH_ERROR")) {
          setError(
            "Authorization Error: " +
              updateError.message.replace("AUTH_ERROR: ", "")
          );
        } else {
          throw updateError;
        }
      } else {
        const actionText =
          decision === "approved_by_new_admin" ? "approved" : "rejected";
        setSnackbarMessage(
          `Admin role transfer ${actionText} successfully for "${clubName}".`
        );
        setSnackbarVisible(true);

        // Navigate back to a relevant screen, e.g., Club Settings or Club Details
        // The user's role for the club might have changed if they approved.
        setTimeout(() => {
          // Go back two screens (RespondToAdminTransfer -> ClubSettings -> ClubDetail) might be good
          // Or pop to top and re-navigate if needed.
          if (navigation.canGoBack()) {
            navigation.goBack(); // Goes back to ClubSettings
            // The ClubSettings screen might then need to re-fetch to hide the pending request
          }
        }, 2500);
      }
    } catch (e: any) {
      console.error(`Error responding to admin transfer (${decision}):`, e);
      setError(
        e.message ||
          `Failed to ${
            decision.includes("approve") ? "approve" : "reject"
          } transfer.`
      );
      // Alert.alert('Error', e.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUserAuthId && !error) {
    // Still waiting for auth user
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error && !isSubmitting) {
    // Show persistent error if not submitting
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error, textAlign: "center" }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.pageTitle}>Admin Role Transfer Request</Title>
      <Card style={styles.card}>
        <Card.Content>
          <Paragraph style={styles.paragraph}>
            You have been proposed to become the new admin for the club:
            <Text style={{ fontWeight: "bold" }}> {clubName}</Text>.
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            This request was initiated by{" "}
            <Text style={{ fontWeight: "bold" }}>
              {currentAdminUsername || "the current admin"}
            </Text>
            .
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            If you accept, their role in the club will be changed to{" "}
            <Text style={{ fontWeight: "bold" }}>{newRoleForCurrentAdmin}</Text>
            .
          </Paragraph>
          <Divider style={styles.divider} />
          <Paragraph style={styles.paragraph}>
            Do you wish to accept this admin role?
          </Paragraph>
        </Card.Content>
        <Card.Actions style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => handleRespondToTransfer("rejected_by_new_admin")}
            disabled={isSubmitting}
            loading={isSubmitting && false} // Show loading on accept button primarily
            icon="close-circle-outline"
            textColor={theme.colors.error}
            style={styles.button}
          >
            Reject Transfer
          </Button>
          <Button
            mode="contained"
            onPress={() => handleRespondToTransfer("approved_by_new_admin")}
            disabled={isSubmitting}
            loading={isSubmitting}
            icon="check-decagram"
            style={styles.button}
          >
            Accept Admin Role
          </Button>
        </Card.Actions>
      </Card>

      {error && !isSubmitting && (
        <HelperText type="error" visible={!!error} style={styles.errorText}>
          {error}
        </HelperText>
      )}

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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    elevation: 2,
  },
  paragraph: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 24,
  },
  divider: {
    marginVertical: 15,
  },
  actions: {
    justifyContent: "space-around", // Or 'flex-end'
    paddingTop: 10,
  },
  button: {
    marginHorizontal: 8, // Add some spacing between buttons
  },
  errorText: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },
});

export default RespondToAdminTransferScreen;
