// src/screens/App/ManageJoinRequestsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from "react-native";
import {
  Text,
  Button,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Snackbar,
  useTheme,
  Divider,
  Avatar,
  Chip,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import { supabase } from "../../../lib/supabase";
import { ProfileStub } from "./ClubDetailScreen"; // Assuming ProfileStub is exported or redefined
import { JoinRequest } from "../types";

type Props = NativeStackScreenProps<
  MainAppStackParamList,
  "ManageJoinRequests"
>;

const ManageJoinRequestsScreen = ({ route }: Props) => {
  const { clubId, clubName } = route.params;
  const theme = useTheme();

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{
    [requestId: string]: boolean;
  }>({}); // For individual request buttons
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
    };
    getUserId();
  }, []);

  const fetchJoinRequests = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("club_join_requests")
        .select(
          `
          id,
          club_id,
          user_id,
          message,
          status,
          requested_at,
          reviewed_at,
          requester_profile:profiles!club_join_requests_user_id_fkey (id, username, avatar_url),
          reviewer_profile:profiles!club_join_requests_reviewer_id_fkey (id, username)
        `
        ) // Ensure no comments are inside this template literal
        .eq("club_id", clubId)
        .order("status", { ascending: true })
        .order("requested_at", { ascending: true });

      if (fetchError) throw fetchError;

      if (data) {
        setRequests(data as unknown as JoinRequest[]);
      }
    } catch (e: any) {
      console.error("Error fetching join requests:", e);
      setError(e.message || "Failed to load join requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchJoinRequests();
  }, [fetchJoinRequests]);

  const handleRequestAction = async (
    requestId: string,
    newStatus: "approved" | "rejected"
  ) => {
    if (!currentUserAuthId) {
      Alert.alert("Error", "Cannot verify admin user.");
      return;
    }
    setActionLoading((prev) => ({ ...prev, [requestId]: true }));
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("club_join_requests")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewer_id: currentUserAuthId, // Admin performing the action
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      setSnackbarMessage(`Request ${newStatus} successfully.`);
      setSnackbarVisible(true);
      // Refresh the list of pending requests
      fetchJoinRequests();
    } catch (e: any) {
      console.error(`Error ${newStatus} join request:`, e);
      setError(e.message || `Failed to ${newStatus} request.`);
      Alert.alert("Error", e.message || `Failed to ${newStatus} request.`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJoinRequests();
  }, [fetchJoinRequests]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Text>Loading requests...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error }}>{error}</Text>
        <Button onPress={fetchJoinRequests}>Try Again</Button>
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No pending join requests for {clubName}.</Text>
      </View>
    );
  }

  const renderRequestItem = ({ item }: { item: JoinRequest }) => {
    const userProfile = item.requester_profile;
    const reviewerProfile = item.reviewer_profile;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.requesterInfo}>
            {userProfile?.avatar_url ? (
              <Avatar.Image
                size={40}
                source={{ uri: userProfile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <Avatar.Text
                size={40}
                label={
                  userProfile?.username?.substring(0, 2).toUpperCase() || "??"
                }
                style={styles.avatar}
              />
            )}
            <View>
              <Title style={{ fontSize: 18 }}>
                {userProfile?.username ||
                  `User ID: ${item.user_id.substring(0, 8)}`}
              </Title>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                Requested: {new Date(item.requested_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {item.message && (
            <Paragraph style={styles.messageText}>
              Message: "{item.message}"
            </Paragraph>
          )}

          <View style={styles.statusContainer}>
            <Text variant="labelLarge">Status: </Text>
            <Chip
              icon={
                item.status === "pending"
                  ? "clock-outline"
                  : item.status === "approved"
                  ? "check-circle-outline"
                  : "close-circle-outline"
              }
              style={[
                styles.statusChip,
                item.status === "approved"
                  ? styles.approvedChip
                  : item.status === "rejected"
                  ? styles.rejectedChip
                  : {},
              ]}
              textStyle={
                item.status !== "pending" ? styles.processedChipText : {}
              }
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Chip>
          </View>

          {item.status !== "pending" && item.reviewed_at && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.outline, marginTop: 4 }}
            >
              Reviewed by:{" "}
              {reviewerProfile?.username ||
                reviewerProfile?.id?.substring(0, 8) ||
                "N/A"}{" "}
              on {new Date(item.reviewed_at).toLocaleDateString()}
            </Text>
          )}
        </Card.Content>

        {item.status === "pending" && ( // Only show actions for pending requests
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="contained"
              onPress={() => handleRequestAction(item.id, "approved")}
              loading={actionLoading[item.id]}
              disabled={actionLoading[item.id]}
              icon="check"
              style={{ marginRight: 8 }}
            >
              Approve
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleRequestAction(item.id, "rejected")}
              loading={actionLoading[item.id]}
              disabled={actionLoading[item.id]}
              icon="close"
              textColor={theme.colors.error}
              // style={{ borderColor: theme.colors.error }} // If you want error border
            >
              Reject
            </Button>
          </Card.Actions>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequestItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text variant="titleMedium" style={styles.listHeader}>
            Pending Requests for {clubName}
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
  listContent: { padding: 16 },
  listHeader: {
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
  },
  card: { marginBottom: 12, elevation: 2 },
  cardActions: { justifyContent: "flex-end", paddingTop: 0, paddingBottom: 8 }, // Adjusted padding
  requesterInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    marginRight: 12,
  },
  messageText: {
    fontStyle: "italic",
    marginTop: 4,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  statusChip: {
    marginLeft: 8,
  },
  approvedChip: {
    backgroundColor: "gray",
  },
  rejectedChip: {
    backgroundColor: "red",
  },
  processedChipText: {
    color: "black",
  },
});

export default ManageJoinRequestsScreen;
