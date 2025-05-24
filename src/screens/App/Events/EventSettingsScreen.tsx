import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Text,
  Title,
  List,
  Divider,
  useTheme,
  MD3Theme,
  ActivityIndicator,
  Button, // For a potential fallback if no actions are available
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types"; // Adjust path
import { supabase } from "../../../lib/supabase"; // Adjust path

type Props = NativeStackScreenProps<
  MainAppStackParamList,
  "EventSettingsScreen"
>;

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // backgroundColor: theme.colors.background, // Set background for the whole screen if ScrollView doesn't fill
    },
    scrollContentContainer: {
      padding: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 10,
      marginTop: 10, // Added margin top
      color: theme.colors.onSurface,
    },
    listItem: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.roundness,
      marginBottom: 10,
      elevation: 1,
    },
    listItemTitleError: {
      color: theme.colors.error,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    section: {
      marginBottom: 20,
    },
  });

const EventSettingsScreen = ({ route, navigation }: Props) => {
  const { eventId, eventName, clubId, createdByUserId } = route.params;
  const theme = useTheme<MD3Theme>();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [currentUserAuthId, setCurrentUserAuthId] = useState<string | null>(
    null
  );
  const [canManage, setCanManage] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkPermissions = async () => {
      setIsLoadingPermissions(true);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (authError || !user) {
        console.error(
          "Auth error or no user in EventSettingsScreen:",
          authError
        );
        setCanManage(false);
        setIsLoadingPermissions(false);
        // Optionally navigate away or show an error message
        Alert.alert("Authentication Error", "Could not verify user.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        return;
      }

      setCurrentUserAuthId(user.id);
      let hasManagementRights = createdByUserId === user.id;

      if (!hasManagementRights && clubId) {
        try {
          const { data: isStaff, error: rpcError } = await supabase.rpc(
            "is_user_club_staff",
            {
              p_user_id: user.id,
              p_club_id: clubId,
            }
          );
          if (rpcError) throw rpcError;
          if (isStaff) {
            hasManagementRights = true;
          }
        } catch (e) {
          console.error("Error checking club staff status:", e);
          // Default to false if check fails, but don't block other checks
        }
      }

      if (isMounted) {
        setCanManage(hasManagementRights);
        setIsLoadingPermissions(false);
      }
    };

    checkPermissions();
    return () => {
      isMounted = false;
    };
  }, [clubId, createdByUserId, navigation]);

  const handleCancelEvent = async () => {
    Alert.alert(
      "Cancel Event",
      `Are you sure you want to permanently cancel the event "${eventName}"? This action cannot be undone.`,
      [
        { text: "Keep Event", style: "cancel" },
        {
          text: "Yes, Cancel Event",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("events")
                .delete()
                .eq("id", eventId);

              if (error) throw error;

              Alert.alert(
                "Event Cancelled",
                `"${eventName}" has been successfully cancelled.`
              );
              // Navigate back two screens (from Settings -> Detail -> List) or to Events list
              navigation.pop(2); // Go back twice if settings is on top of detail
              // Or navigate to a specific screen
              // navigation.navigate('AppTabs', { screen: 'Events' });
            } catch (e: any) {
              console.error("Error cancelling event:", e);
              Alert.alert("Error", e.message || "Failed to cancel the event.");
            }
          },
        },
      ]
    );
  };

  if (isLoadingPermissions) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{ marginTop: 10 }}>Checking permissions...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContentContainer}
    >
      <Title style={styles.headerTitle}>Settings for "{eventName}"</Title>
      <Divider style={{ marginBottom: 20 }} />

      {canManage ? (
        <List.Section title="Event Management">
          <List.Item
            title="Edit Event Details"
            description="Modify event information, time, location, etc."
            left={(props) => <List.Icon {...props} icon="pencil-outline" />}
            onPress={() =>
              navigation.navigate("EditEventScreen", { eventId, eventName })
            }
            style={styles.listItem}
          />
          <List.Item
            title="Cancel Event"
            description="Permanently delete this event instance."
            left={(props) => (
              <List.Icon {...props} icon="calendar-remove-outline" />
            )}
            onPress={handleCancelEvent}
            style={styles.listItem}
            titleStyle={styles.listItemTitleError} // Style for destructive action
            descriptionStyle={{ color: theme.colors.error }} // Optional: make description error color too
          />
          {/* Future: Manage Participants (e.g., view list, remove, if needed for controlled/private events) */}
          {/* <List.Item
            title="Manage Participants"
            description="View and manage event attendees."
            left={props => <List.Icon {...props} icon="account-multiple-outline" />}
            onPress={() => Alert.alert("Manage Participants", "Coming soon!")}
            style={styles.listItem}
          /> */}
        </List.Section>
      ) : (
        <View style={styles.centered}>
          <Text>You do not have permission to manage this event.</Text>
          {/* Provide a way back if they landed here by mistake or permissions changed */}
          <Button onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
            Go Back
          </Button>
        </View>
      )}
      {/* Add other event settings here if any (e.g., notification preferences for this event) */}
    </ScrollView>
  );
};

export default EventSettingsScreen;
