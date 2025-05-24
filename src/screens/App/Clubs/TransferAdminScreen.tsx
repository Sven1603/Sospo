// src/screens/App/TransferAdminScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Text,
  Button,
  RadioButton,
  ActivityIndicator,
  Snackbar,
  useTheme,
  Title,
  List,
  Divider,
  HelperText, // Added HelperText
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types"; // Adjust path if needed
import { supabase } from "../../../lib/supabase"; // Adjust path if needed
import { ProfileStub } from "./ClubDetailScreen"; // Adjust path if needed

type ClubMemberOption = {
  user_id: string;
  member_profile: ProfileStub | null;
  role: "member" | "contributor";
};

type Props = NativeStackScreenProps<
  MainAppStackParamList,
  "TransferAdminScreen"
>;

const TransferAdminScreen = ({ route, navigation }: Props) => {
  const { clubId, clubName } = route.params;
  const theme = useTheme();

  const [eligibleMembers, setEligibleMembers] = useState<ClubMemberOption[]>(
    []
  );
  const [selectedNewAdminId, setSelectedNewAdminId] = useState<string | null>(
    null
  );
  const [currentAdminNewRole, setCurrentAdminNewRole] = useState<
    "contributor" | "member"
  >("contributor"); // Renamed for clarity

  const [loadingMembers, setLoadingMembers] = useState(true); // Renamed for clarity
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [currentAuthUserId, setCurrentAuthUserId] = useState<string | null>(
    null
  ); // Renamed for clarity

  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentAuthUserId(user.id);
      else setLoadingMembers(false); // Stop loading if no user
    };
    getUserId();
  }, []);

  const fetchEligibleMembers = useCallback(async () => {
    if (!clubId || !currentAuthUserId) return;
    setLoadingMembers(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("club_members")
        .select(
          `
          user_id,
          role,
          member_profile:profiles!club_members_user_id_fkey (id, username, avatar_url)
        `
        )
        .eq("club_id", clubId)
        .neq("user_id", currentAuthUserId)
        .in("role", ["member", "contributor"]);

      if (fetchError) throw fetchError;

      if (data) {
        const processedData = data.map((member: any) => {
          let profile: ProfileStub | null = null;
          if (member.member_profile) {
            if (
              Array.isArray(member.member_profile) &&
              member.member_profile.length > 0
            ) {
              profile = member.member_profile[0];
            } else if (!Array.isArray(member.member_profile)) {
              profile = member.member_profile;
            }
          }
          return {
            ...member,
            member_profile: profile,
            role: member.role as "member" | "contributor",
          };
        });
        setEligibleMembers(processedData);
      }
    } catch (e: any) {
      console.error("Error fetching eligible members:", e);
      setError(e.message || "Failed to load members.");
    } finally {
      setLoadingMembers(false);
    }
  }, [clubId, currentAuthUserId]);

  useEffect(() => {
    if (currentAuthUserId) {
      fetchEligibleMembers();
    }
  }, [currentAuthUserId, fetchEligibleMembers]);

  const handleInitiateTransferRequest = async () => {
    // Renamed function
    if (!selectedNewAdminId) {
      setError("Please select a member to propose as the new admin.");
      return;
    }
    if (!currentAuthUserId) {
      // Should be set if admin is on this screen
      setError("Could not verify your identity. Please try again.");
      return;
    }

    // Confirmation Alert
    const selectedMember = eligibleMembers.find(
      (m) => m.user_id === selectedNewAdminId
    );
    const newAdminName =
      selectedMember?.member_profile?.username ||
      `User ID ${selectedNewAdminId.substring(0, 6)}`;

    Alert.alert(
      "Confirm Admin Transfer Initiation",
      `Are you sure you want to request to make ${newAdminName} the new admin for "${clubName}"? \n\nYour role will become '${currentAdminNewRole}' if they accept.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Initiate Request",
          style: "default",
          onPress: async () => {
            // Changed style from destructive
            setIsSubmitting(true);
            setError(null);
            try {
              const { data: requestId, error: rpcError } = await supabase.rpc(
                "initiate_admin_transfer_request",
                {
                  p_club_id: clubId,
                  p_proposed_new_admin_user_id: selectedNewAdminId,
                  p_current_admin_new_role: currentAdminNewRole,
                }
              );

              if (rpcError) {
                // Check for specific errors from the DB function
                if (rpcError.message.includes("AUTH_ERROR")) {
                  setError(
                    "Authentication error: " +
                      rpcError.message.replace("AUTH_ERROR: ", "")
                  );
                } else if (rpcError.message.includes("VALUE_ERROR")) {
                  setError(
                    "Invalid selection: " +
                      rpcError.message.replace("VALUE_ERROR: ", "")
                  );
                } else if (rpcError.message.includes("CONFLICT_ERROR")) {
                  setError(
                    "Conflict: " +
                      rpcError.message.replace("CONFLICT_ERROR: ", "")
                  );
                  Alert.alert(
                    "Request Already Pending",
                    "An admin transfer request for this club is already pending approval by another user or has recently been initiated."
                  );
                } else {
                  throw rpcError; // Re-throw other RPC errors
                }
              } else if (requestId) {
                setSnackbarMessage(
                  `Admin transfer request for "${clubName}" initiated. Waiting for ${newAdminName} to approve.`
                );
                setSnackbarVisible(true);
                // Navigate back as the request is now pending with the other user
                setTimeout(() => {
                  // Go back two screens: from TransferAdmin to ClubSettings, then ClubSettings to ClubDetail
                  if (navigation.canGoBack()) navigation.goBack(); // First pop
                  // If you want to ensure it goes back further, manage stack or use pop(n) if available
                  // For now, a single goBack to ClubSettings is fine.
                  // Or navigation.popToTop(); to go to the top of the stack.
                  // Let's go back to ClubSettings, which itself might need a refresh.
                  // navigation.navigate('ClubSettings', { clubId, clubName }); // This might not refresh if already there
                  // navigation.replace('ClubSettings', { clubId, clubName }); // This might work better to force re-render/re-fetch
                  // Safest after a major action is to go back or pop to top
                  if (navigation.canGoBack()) {
                    navigation.goBack(); // Goes from TransferAdminScreen to ClubSettingsScreen
                  }
                }, 3500); // Give time for snackbar
              } else {
                throw new Error(
                  "Failed to initiate transfer: No request ID returned."
                );
              }
            } catch (e: any) {
              console.error("Error initiating admin transfer:", e);
              setError(e.message || "Failed to initiate admin transfer.");
              // Alert.alert('Initiation Failed', e.message); // Avoid too many alerts if error text is shown
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loadingMembers) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{ marginTop: 10 }}>Loading eligible members...</Text>
      </View>
    );
  }

  // Error display after loading, if the member list couldn't be fetched.
  if (error && eligibleMembers.length === 0 && !isSubmitting) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error }}>{error}</Text>
        <Button onPress={fetchEligibleMembers}>Try Again</Button>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.pageTitle}>Initiate Admin Transfer</Title>
      <Text style={styles.instructions}>
        Select a current member or contributor to become the new sole admin for
        "{clubName}". They will need to approve this transfer. After they
        approve, your role will be changed to the one you select below.
      </Text>

      <List.Section title="1. Select Proposed New Admin*">
        {eligibleMembers.length === 0 && !loadingMembers && (
          <Text
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              color: theme.colors.onSurfaceVariant,
            }}
          >
            No other members or contributors found in this club who are eligible
            to become admin. A user must be a 'member' or 'contributor' (and not
            already an admin) to be selected.
          </Text>
        )}
        <RadioButton.Group
          onValueChange={(id) => setSelectedNewAdminId(id)}
          value={selectedNewAdminId || ""}
        >
          {eligibleMembers.map((member) => (
            <List.Item
              key={member.user_id}
              title={
                member.member_profile?.username ||
                `User ${member.user_id.substring(0, 6)}`
              }
              description={`Current role: ${
                member.role.charAt(0).toUpperCase() + member.role.slice(1)
              }`}
              left={(props) => (
                <RadioButton
                  {...props}
                  value={member.user_id}
                  status={
                    selectedNewAdminId === member.user_id
                      ? "checked"
                      : "unchecked"
                  }
                />
              )}
              onPress={() => setSelectedNewAdminId(member.user_id)}
              style={
                selectedNewAdminId === member.user_id
                  ? styles.selectedListItem
                  : styles.listItem
              }
            />
          ))}
        </RadioButton.Group>
      </List.Section>

      <Divider style={{ marginVertical: 10 }} />

      <List.Section title="2. Your New Role After Transfer*">
        <RadioButton.Group
          onValueChange={(role) =>
            setCurrentAdminNewRole(role as "contributor" | "member")
          }
          value={currentAdminNewRole}
        >
          <View style={styles.radioRow}>
            <View style={styles.radioItemContainer}>
              <RadioButton
                value="contributor"
                status={
                  currentAdminNewRole === "contributor"
                    ? "checked"
                    : "unchecked"
                }
              />
              <Text onPress={() => setCurrentAdminNewRole("contributor")}>
                Contributor
              </Text>
            </View>
            <View style={styles.radioItemContainer}>
              <RadioButton
                value="member"
                status={
                  currentAdminNewRole === "member" ? "checked" : "unchecked"
                }
              />
              <Text onPress={() => setCurrentAdminNewRole("member")}>
                Member
              </Text>
            </View>
          </View>
        </RadioButton.Group>
      </List.Section>

      {error && (
        <HelperText type="error" visible={!!error} style={styles.errorText}>
          {error}
        </HelperText>
      )}

      <Button
        mode="contained"
        onPress={handleInitiateTransferRequest}
        loading={isSubmitting}
        disabled={isSubmitting || loadingMembers || !selectedNewAdminId}
        style={styles.button}
        icon="send-outline"
      >
        {isSubmitting ? "Sending Request..." : "Send Transfer Request"}
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

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
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
    marginBottom: 8,
  },
  instructions: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 14 /*color: theme.colors.onSurfaceVariant*/,
  }, // theme needs to be passed or used from useTheme
  listItem: {
    backgroundColor: "#f9f9f9" /*theme.colors.surfaceVariant*/,
    borderRadius: 4,
    marginBottom: 6,
    elevation: 1,
  },
  selectedListItem: {
    backgroundColor: "#e0e0ff" /*theme.colors.primaryContainer*/,
    borderRadius: 4,
    marginBottom: 6,
    elevation: 2,
  },
  radioRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 8,
  },
  radioItemContainer: { flexDirection: "row", alignItems: "center" },
  button: { marginTop: 24, paddingVertical: 8 },
  errorText: { textAlign: "center", marginVertical: 10, fontSize: 14 },
});

export default TransferAdminScreen;
