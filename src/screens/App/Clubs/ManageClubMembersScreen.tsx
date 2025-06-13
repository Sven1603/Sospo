// src/screens/App/ManageClubMembersScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, Alert } from "react-native";
import {
  Text,
  Button,
  Card,
  Title,
  ActivityIndicator,
  Snackbar,
  useTheme,
  Avatar,
  SegmentedButtons, // Good for toggling roles
  Divider,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import { supabase } from "../../../lib/supabase";
import { ClubMember } from "../../../types/clubTypes";
import { ProfileStub } from "../../../types/commonTypes";

type Props = NativeStackScreenProps<MainAppStackParamList, "ManageClubMembers">;

const ManageClubMembersScreen = ({ route, navigation }: Props) => {
  const { clubId, clubName } = route.params;
  const theme = useTheme();

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{
    [userId: string]: boolean;
  }>({});
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUserId();
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("club_members")
        .select(
          `
          user_id,
          role,
          joined_at,
          member_profile:profiles!club_members_user_id_fkey (id, username, avatar_url)
        `
        )
        .eq("club_id", clubId)
        .order("joined_at", { ascending: true });

      if (fetchError) throw fetchError;

      if (data) {
        // Ensure member_profile is an object, not array, based on previous fixes
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
          return { ...member, member_profile: profile };
        });
        setMembers(processedData as ClubMember[]);
      }
    } catch (e: any) {
      console.error("Error fetching club members:", e);
      setError(e.message || "Failed to load members.");
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async (
    targetUserId: string,
    newRole: "member" | "contributor"
  ) => {
    const targetMember = members.find((m) => m.user_id === targetUserId);

    // Prevent changing an 'admin's role using this UI.
    // This applies if the target is any admin, including if the current admin targets themselves.
    if (targetMember?.role === "admin") {
      Alert.alert(
        "Action Denied",
        "The 'admin' role cannot be changed directly here. Please use a dedicated 'Transfer Admin Role' feature if you wish to change the club admin."
      );
      return;
    }

    // If the target is not an admin (i.e., they are 'member' or 'contributor'), proceed with the update.
    // The newRole is already validated by the SegmentedButtons to be 'member' or 'contributor'.

    setActionLoading((prev) => ({ ...prev, [targetUserId]: true }));
    setError(null); // Clear previous errors
    try {
      const { error: updateError } = await supabase
        .from("club_members")
        .update({ role: newRole })
        .eq("club_id", clubId)
        .eq("user_id", targetUserId);

      if (updateError) throw updateError;

      setSnackbarMessage("Member role updated successfully.");
      setSnackbarVisible(true);
      fetchMembers(); // Refresh list to show the new role
    } catch (e: any) {
      console.error("Error updating member role:", e);
      setError(e.message || "Failed to update role."); // Set error state
      // Alert.alert('Error', e.message || 'Failed to update role.'); // Alert can be kept or removed if HelperText is used
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    // Similar checks as role change: admin can't remove themselves if they are the only admin.
    // The 'transfer admin' flow should handle replacing the admin.
    const targetMember = members.find((m) => m.user_id === targetUserId);
    if (targetMember?.role === "admin") {
      Alert.alert(
        "Action Denied",
        "Admin cannot be removed directly. Transfer admin role first."
      );
      return;
    }

    Alert.alert(
      "Confirm Removal",
      `Are you sure you want to remove ${
        targetMember?.profiles?.username || "this member"
      } from the club?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setActionLoading((prev) => ({ ...prev, [targetUserId]: true }));
            try {
              const { error: deleteError } = await supabase
                .from("club_members")
                .delete()
                .eq("club_id", clubId)
                .eq("user_id", targetUserId);

              if (deleteError) throw deleteError;

              setSnackbarMessage("Member removed successfully.");
              setSnackbarVisible(true);
              fetchMembers(); // Refresh list
            } catch (e: any) {
              console.error("Error removing member:", e);
              Alert.alert("Error", e.message || "Failed to remove member.");
            } finally {
              setActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
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
        <Text>Loading members...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error }}>{error}</Text>
        <Button onPress={fetchMembers}>Try Again</Button>
      </View>
    );
  }

  const renderMemberItem = ({ item }: { item: ClubMember }) => {
    const isCurrentUserAdmin =
      members.find((m) => m.user_id === currentUserId)?.role === "admin";
    const isTargetAdmin = item.role === "admin";

    // Admin cannot change their own role here or remove themselves if they are the admin (to ensure at least one admin via transfer)
    // Admin cannot demote another admin here (transfer feature handles that)
    const canManageRole = isCurrentUserAdmin && !isTargetAdmin; // Can change role if current user is admin AND target is not an admin
    const canRemove =
      isCurrentUserAdmin && !isTargetAdmin && item.user_id !== currentUserId; // Admin can remove others (not admin, not self)

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.memberRow}>
            <Avatar.Text
              size={40}
              label={
                item.profiles?.username?.substring(0, 2).toUpperCase() || "??"
              }
              style={styles.avatar}
            />
            <View style={styles.memberDetails}>
              <Title style={{ fontSize: 16 }}>
                {item.profiles?.username ||
                  `User ${item.user_id.substring(0, 6)}`}
              </Title>
              <Text style={{ color: theme.colors.outline }}>
                {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
              </Text>
            </View>
          </View>
          {canManageRole && (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.roleLabel}>Set Role:</Text>
              <SegmentedButtons
                value={item.role} // Current role
                onValueChange={(newRole) => {
                  if (newRole === "member" || newRole === "contributor") {
                    handleRoleChange(
                      item.user_id,
                      newRole as "member" | "contributor"
                    );
                  }
                }}
                buttons={[
                  { value: "member", label: "Member" },
                  { value: "contributor", label: "Contributor" },
                  // { value: 'admin', label: 'Admin', disabled: true }, // Admin role managed by transfer
                ]}
                style={styles.segmentedButton}
                density="small"
              />
            </>
          )}
        </Card.Content>
        {canRemove && (
          <Card.Actions style={styles.cardActions}>
            <Button
              icon="account-remove-outline"
              onPress={() => handleRemoveMember(item.user_id)}
              textColor={theme.colors.error}
              disabled={actionLoading[item.user_id]}
              loading={actionLoading[item.user_id]}
            >
              Remove
            </Button>
          </Card.Actions>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.user_id}
        renderItem={renderMemberItem}
        ListHeaderComponent={
          <Text variant="titleLarge" style={styles.listHeader}>
            Members of {clubName}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text>No members found.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{ label: "OK", onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  listHeader: { margin: 16, textAlign: "center", fontWeight: "bold" },
  listContent: { paddingBottom: 20 },
  card: { marginHorizontal: 16, marginVertical: 6, elevation: 1 },
  memberRow: { flexDirection: "row", alignItems: "center" },
  avatar: { marginRight: 16 },
  memberDetails: { flex: 1 },
  roleLabel: {
    marginTop: 10,
    marginBottom: 5,
    fontSize: 14,
    fontWeight: "bold",
  },
  segmentedButton: { marginTop: 5, marginBottom: 5 },
  cardActions: {
    justifyContent: "flex-end",
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 10,
  },
  divider: { marginVertical: 8 },
});

export default ManageClubMembersScreen;
