// src/screens/App/Events/ManageEventJoinRequestsScreen.tsx
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
  MD3Theme,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import { supabase } from "../../../lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { ProfileStub } from "../../../types/commonTypes";

// Type for an individual join request item
type EventJoinRequestItem = {
  id: string; // request ID
  event_id: string;
  user_id: string;
  message: string | null;
  status: "pending" | "approved" | "rejected"; // From your ENUM
  requested_at: string;
  // For displaying user info, joined from profiles
  requester_profile: ProfileStub[] | null; // Keep as array type to align with previous fixes
};

type Props = NativeStackScreenProps<
  MainAppStackParamList,
  "ManageEventJoinRequests"
>;

const ManageEventJoinRequestsScreen: React.FC<Props> = ({
  route,
  navigation,
}) => {
  const { eventId, eventName } = route.params;
  const theme = useTheme<MD3Theme>();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [requests, setRequests] = useState<EventJoinRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{
    [requestId: string]: boolean;
  }>({});
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
      // else handle not authenticated if this screen requires it for actions
    };
    getUserId();
  }, []);

  const fetchJoinRequests = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("event_join_requests")
        .select(
          `
          id,
          event_id,
          user_id,
          message,
          status,
          requested_at,
          requester_profile:profiles!event_join_requests_user_id_fkey (id, username, avatar_url)
        `
        )
        .eq("event_id", eventId)
        .eq("status", "pending") // Only show pending requests for action
        .order("requested_at", { ascending: true });

      if (fetchError) throw fetchError;

      if (data) {
        setRequests(data as any as EventJoinRequestItem[]); // Cast, ensure nested profile is handled if array
      } else {
        setRequests([]);
      }
    } catch (e: any) {
      console.error("Error fetching event join requests:", e);
      setError(e.message || "Failed to load join requests.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true; // To prevent state updates if component unmounts

      const loadData = async () => {
        console.log("[ManageEventJoinRequestsScreen] Focus effect triggered.");
        if (!refreshing) {
          // Avoid double loading if a refresh is already in progress
          await fetchJoinRequests();
        }
      };

      if (isActive) {
        loadData();
      }

      return () => {
        isActive = false; // Cleanup
      };
    }, [fetchJoinRequests, refreshing]) // Dependency on the memoized fetchJoinRequests and refreshing
  );

  const onRefresh = useCallback(() => {
    console.log("[ManageEventJoinRequestsScreen] Pull-to-refresh triggered.");
    setRefreshing(true);
    fetchJoinRequests();
    setRefreshing(false);
  }, [fetchJoinRequests]);

  const handleRequestAction = async (
    requestId: string,
    newStatus: "approved" | "rejected"
  ) => {
    if (!currentUserAuthId) {
      Alert.alert(
        "Error",
        "Cannot verify your identity to perform this action."
      );
      return;
    }
    setActionLoading((prev) => ({ ...prev, [requestId]: true }));
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("event_join_requests")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewer_id: currentUserAuthId, // Logged-in admin/organizer is the reviewer
        })
        .eq("id", requestId)
        .eq("event_id", eventId); // Ensure we're updating for the correct event

      if (updateError) throw updateError;

      setSnackbarMessage(`Request ${newStatus} successfully.`);
      setSnackbarVisible(true);
      fetchJoinRequests(); // Refresh the list of pending requests
    } catch (e: any) {
      console.error(`Error ${newStatus} join request:`, e);
      setError(e.message || `Failed to ${newStatus} request.`);
      Alert.alert(
        "Action Failed",
        e.message || `Failed to ${newStatus} request.`
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{ marginTop: 10 }}>Loading Join Requests...</Text>
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

  const renderRequestItem = ({ item }: { item: EventJoinRequestItem }) => {
    const requesterProfile =
      item.requester_profile && item.requester_profile.length > 0
        ? item.requester_profile[0]
        : null;
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title>
            {requesterProfile?.username ||
              `User ID: ${item.user_id.substring(0, 8)}`}
          </Title>
          {item.message && <Paragraph>Message: "{item.message}"</Paragraph>}
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            Requested: {new Date(item.requested_at).toLocaleDateString()}
          </Text>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button
            mode="outlined"
            onPress={() => handleRequestAction(item.id, "rejected")}
            loading={actionLoading[item.id]}
            disabled={actionLoading[item.id]}
            icon="close-circle-outline"
            textColor={theme.colors.error}
            style={{ marginRight: 8 }}
          >
            Reject
          </Button>
          <Button
            mode="contained"
            onPress={() => handleRequestAction(item.id, "approved")}
            loading={actionLoading[item.id]}
            disabled={actionLoading[item.id]}
            icon="check-circle-outline"
          >
            Approve
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequestItem}
        ListHeaderComponent={
          <Text variant="titleLarge" style={styles.listHeader}>
            Pending Join Requests for "{eventName}"
          </Text>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.centered}>
              <Text>No pending join requests for this event.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]} // Optional: for Android pull indicator color
            tintColor={theme.colors.primary} // Optional: for iOS pull indicator color
          />
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

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    listHeader: {
      marginHorizontal: 16,
      marginTop: 20,
      marginBottom: 10,
      textAlign: "center",
      fontWeight: "bold",
    },
    listContent: { paddingHorizontal: 16, paddingBottom: 16 },
    card: { marginBottom: 12, backgroundColor: theme.colors.surfaceVariant },
    cardActions: {
      justifyContent: "flex-end",
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
      paddingTop: 8,
    },
  });

export default ManageEventJoinRequestsScreen;
