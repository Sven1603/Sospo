import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Text,
  Button,
  List,
  Divider,
  ActivityIndicator,
  useTheme,
  Snackbar,
  Title,
  Card,
  Paragraph, // Added for section titles
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types"; // Adjust path if needed
import { supabase } from "../../../lib/supabase"; // Adjust path if needed
import { useFocusEffect } from "@react-navigation/native";

// Type for the core club details needed on this screen
type ClubCoreDetails = {
  id: string;
  name: string;
  created_by: string | null;
  is_verified_listing: boolean;
  privacy: "public" | "private" | "controlled";
};

// Type for the user's membership in this club
type UserClubMembership = {
  role: "admin" | "member" | "contributor";
} | null;

// Type for the pending admin transfer request data relevant to this screen
type PendingAdminTransfer = {
  id: string; // request id
  current_admin_user_id: string;
  current_admin_new_role: "member" | "contributor";
  profiles: { username: string | null } | null; // Profile of the admin who initiated
};

type Props = NativeStackScreenProps<MainAppStackParamList, "ClubSettings">;

const ClubSettingsScreen = ({ route, navigation }: Props) => {
  const { clubId, clubName } = route.params;
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [clubDetails, setClubDetails] = useState<ClubCoreDetails | null>(null);
  const [userMembership, setUserMembership] =
    useState<UserClubMembership>(null);
  const [currentUserAuthId, setCurrentUserAuthId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const [pendingAdminTransfer, setPendingAdminTransfer] =
    useState<PendingAdminTransfer | null>(null);
  const [loadingTransferRequest, setLoadingTransferRequest] = useState(false);

  const [actionLoading, setActionLoading] = useState(false); // For actions like Leave/Claim
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const fetchData = useCallback(
    async (authId: string) => {
      setLoading(true);
      setError(null);
      try {
        // Fetch club core details
        const { data: clubData, error: clubError } = await supabase
          .from("clubs")
          .select("id, name, created_by, is_verified_listing, privacy")
          .eq("id", clubId)
          .single();

        if (clubError) throw clubError;
        if (!clubData) throw new Error(`Club with ID ${clubId} not found.`);
        setClubDetails(clubData as ClubCoreDetails);

        // Fetch user's membership for this club
        const { data: membershipData, error: membershipError } = await supabase
          .from("club_members")
          .select("role")
          .eq("club_id", clubId)
          .eq("user_id", authId)
          .single();

        // PGRST116: "Single row not found" is okay, means user is not a member
        if (membershipError && membershipError.code !== "PGRST116") {
          throw membershipError;
        }
        setUserMembership(membershipData as UserClubMembership); // Will be null if not a member

        const { data: transferRequestData, error: transferError } =
          await supabase
            .from("club_admin_transfer_requests")
            .select(
              `
          id,
          current_admin_user_id,
          current_admin_new_role,
          initiating_admin_profile:profiles!club_admin_transfer_requests_current_admin_user_id_fkey (username)
        `
            )
            .eq("club_id", clubId)
            .eq("proposed_new_admin_user_id", authId)
            .eq("status", "pending_new_admin_approval")
            .maybeSingle(); // User can only have one such pending request for a club

        if (transferError) throw transferError;
        if (transferRequestData) {
          // Adapt the fetched data to PendingAdminTransfer, especially the aliased profile
          const request = transferRequestData as any; // Cast to any for temp access
          setPendingAdminTransfer({
            id: request.id,
            current_admin_user_id: request.current_admin_user_id,
            current_admin_new_role: request.current_admin_new_role,
            profiles: request.initiating_admin_profile
              ? { username: request.initiating_admin_profile.username }
              : null,
          });
        } else {
          setPendingAdminTransfer(null);
        }
      } catch (e: any) {
        console.error("Error fetching club/membership settings data:", e);
        setError(e.message || "Failed to load settings data.");
      } finally {
        setLoading(false);
        setLoadingTransferRequest(false);
      }
    },
    [clubId]
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const getAuthAndFetchFocused = async () => {
        console.log("[ClubSettingsScreen] Focus effect triggered.");
        // setLoading(true); // fetchData will set its own loading states
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!isActive) return;
        if (user) {
          if (currentUserAuthId !== user.id) {
            // Only update if authId changes, or always set
            setCurrentUserAuthId(user.id);
          }
          await fetchData(user.id); // Call fetchData
        } else {
          setError("User not authenticated. Please login again.");
          setLoading(false);
          setLoadingTransferRequest(false);
        }
      };

      getAuthAndFetchFocused();

      return () => {
        isActive = false;
        console.log("[ClubSettingsScreen] Focus effect cleanup.");
      };
    }, [fetchData, currentUserAuthId]) // Add currentUserAuthId to ensure it has the latest if needed by fetchData indirectly
    // though fetchData takes authId as param.
    // Main dependency is fetchData.
  );

  const isOwner = clubDetails?.created_by === currentUserAuthId;
  const isAdmin = userMembership?.role === "admin";
  const isContributor = userMembership?.role === "contributor";
  const isMember = !!userMembership; // True if any role (admin, contributor, or member)

  // --- Action Handlers ---
  const handleLeaveClub = async () => {
    if (!currentUserAuthId || !clubDetails) return;

    Alert.alert(
      "Confirm Leave",
      `Are you sure you want to leave "${clubDetails.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave Club",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              const { error: leaveError } = await supabase
                .from("club_members")
                .delete()
                .eq("club_id", clubDetails.id)
                .eq("user_id", currentUserAuthId); // RLS also ensures user can only delete their own membership

              if (leaveError) throw leaveError;

              setSnackbarMessage(`Successfully left ${clubDetails.name}.`);
              setSnackbarVisible(true);
              setUserMembership(null); // Optimistic update for UI
              // Navigate back to club details, which should re-fetch or show updated state
              setTimeout(() => navigation.goBack(), 1500);
            } catch (e: any) {
              Alert.alert(
                "Error Leaving Club",
                e.message || "Could not leave the club."
              );
              console.error("Error leaving club:", e);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{ marginTop: 10 }}>Loading Settings...</Text>
      </View>
    );
  }

  if (error || !clubDetails) {
    return (
      <View style={styles.centered}>
        <Text
          style={{
            color: theme.colors.error,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          {error || "Could not load club settings."}
        </Text>
        <Button
          onPress={() => {
            if (currentUserAuthId) fetchData(currentUserAuthId);
          }}
        >
          Try Again
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {pendingAdminTransfer && !isAdmin && !isOwner && (
        // Show if a transfer is pending for me, AND I am not already the admin or owner.
        // The proposed new admin will be a 'member' or 'contributor', so isMember might be true.
        <List.Section
          title="Action Required: Admin Role Transfer"
          style={styles.actionRequiredSection}
        >
          <Card
            mode="elevated"
            style={{ backgroundColor: theme.colors.tertiaryContainer }}
          >
            <Card.Content>
              <Paragraph>
                User{" "}
                <Text style={{ fontWeight: "bold" }}>
                  {pendingAdminTransfer.profiles?.username ||
                    "The current admin"}
                </Text>{" "}
                has proposed to make you the new admin for this club. If you
                accept, their role will become '
                {pendingAdminTransfer.current_admin_new_role}'.
              </Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button
                onPress={() =>
                  navigation.navigate("RespondToAdminTransferScreen", {
                    transferRequestId: pendingAdminTransfer.id,
                    clubName: clubDetails?.name || clubName,
                    // Ensure these params are correctly typed and passed
                    currentAdminUsername:
                      pendingAdminTransfer.profiles?.username ||
                      "Previous Admin",
                    newRoleForCurrentAdmin:
                      pendingAdminTransfer.current_admin_new_role,
                  })
                }
              >
                View & Respond
              </Button>
            </Card.Actions>
          </Card>
        </List.Section>
      )}
      {/* General Configuration for Owner/Admin/Contributor */}
      {(isOwner || isAdmin || isContributor) && (
        <List.Section title="Club Profile & Settings">
          <List.Item
            title="Edit Club Details"
            description="Update name, description, sports, privacy, etc."
            left={(props) => <List.Icon {...props} icon="pencil-outline" />}
            onPress={() => navigation.navigate("EditClub", { clubId })}
            style={styles.listItem}
          />
          <List.Item
            title="Create Club Event"
            description="Organize a new event for this club."
            left={(props) => <List.Icon {...props} icon="calendar-plus" />}
            onPress={() =>
              navigation.navigate("EventWizardScreen", {
                clubId: clubDetails.id,
                clubName: clubDetails.name,
              })
            }
            style={styles.listItem}
          />
        </List.Section>
      )}

      {/* Admin-Specific Actions */}
      {(isOwner || isAdmin || isContributor) && (
        <List.Section title="Administration">
          <List.Item
            title="Manage Join Requests"
            description="Approve or reject pending join requests for this club."
            left={(props) => (
              <List.Icon {...props} icon="account-multiple-plus-outline" />
            )}
            onPress={() =>
              navigation.navigate("ManageJoinRequests", { clubId, clubName })
            }
            style={styles.listItem}
          />
          {isOwner ||
            (isAdmin && (
              <List.Item
                title="Manage Club Members"
                description="View members, change roles (member/contributor), remove members."
                left={(props) => (
                  <List.Icon {...props} icon="account-group-outline" />
                )}
                onPress={() =>
                  navigation.navigate("ManageClubMembers", { clubId, clubName })
                }
                style={styles.listItem}
              />
            ))}
          {/* Only the current admin can initiate transfer */}
          {isAdmin && (
            <List.Item
              title="Transfer Admin Role"
              description="Transfer your admin role to another member of this club."
              left={(props) => <List.Icon {...props} icon="crown-outline" />}
              onPress={() =>
                navigation.navigate("TransferAdminScreen", { clubId, clubName })
              }
              style={styles.listItem}
            />
          )}
        </List.Section>
      )}

      {/* Actions for Regular Members (who are not owner/admin/contributor) */}
      {isMember && !(isOwner || isAdmin || isContributor) && (
        <List.Section title="Your Membership">
          <Button
            mode="outlined"
            icon="logout"
            onPress={handleLeaveClub}
            loading={actionLoading}
            disabled={actionLoading}
            style={styles.actionButton}
            textColor={theme.colors.error} // Make it look a bit like a destructive action
            // You might want to use List.Item style for consistency if preferred
          >
            Leave Club
          </Button>
        </List.Section>
      )}

      {/* Action for Non-Members if club is claimable */}
      {!isMember &&
        clubDetails.is_verified_listing &&
        clubDetails.created_by === null && (
          <List.Section title="This Club is Unclaimed">
            <List.Item
              title="Claim this Club"
              description="Request to become the admin of this verified club."
              left={(props) => (
                <List.Icon {...props} icon="flag-variant-outline" />
              )}
              onPress={() =>
                navigation.navigate("ClaimClub", { clubId, clubName })
              }
              style={styles.listItem}
            />
          </List.Section>
        )}

      {/* Fallback if no actions are available for the user */}
      {!(isOwner || isAdmin || isContributor) &&
        !(isMember && !(isOwner || isAdmin || isContributor)) &&
        !(
          !isMember &&
          clubDetails.is_verified_listing &&
          clubDetails.created_by === null
        ) && (
          <View style={styles.centered}>
            <Text>
              No specific management actions available for you for this club.
            </Text>
          </View>
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
    flex: 1,
    // paddingVertical: 10, // ScrollView contentContainerStyle might be better for padding
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 20, // If it's a fallback message within ScrollView
  },
  headerTitle: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  listItem: {
    // backgroundColor: theme.colors.surface, // Example theming
    // marginBottom: 1, // if you want slight separation
  },
  actionButton: {
    marginHorizontal: 16,
    marginVertical: 10,
    paddingVertical: 6,
  },
  actionRequiredSection: {
    marginBottom: 16,
    // backgroundColor: theme.colors.tertiaryContainer, // Moved to Card style
    // borderRadius: theme.roundness,
    // padding: 8, // Padding inside Card.Content is better
  },
});

export default ClubSettingsScreen;
