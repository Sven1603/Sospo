// src/screens/App/Admin/ManageClubClaimsScreen.tsx
import React, { useCallback } from "react";
import { View, StyleSheet, FlatList, Alert } from "react-native";
import {
  Text,
  Button,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  useTheme,
  MD3Theme,
} from "react-native-paper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import {
  fetchPendingClubClaims,
  respondToClubClaim,
} from "../../../services/adminService";
import { AppTheme, useAppTheme } from "../../../theme/theme";
import StyledText from "../../../components/ui/StyledText";
import StyledButton from "../../../components/ui/StyledButton";

const ManageClubClaimsScreen = () => {
  const theme = useAppTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const queryClient = useQueryClient();

  const {
    data: claims = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["pendingClubClaims"],
    queryFn: fetchPendingClubClaims,
  });

  const claimResponseMutation = useMutation({
    mutationFn: respondToClubClaim,
    onSuccess: (data, variables) => {
      Alert.alert("Success", `The claim has been ${variables.newStatus}.`);
      // Refetch the list of pending claims
      queryClient.invalidateQueries({ queryKey: ["pendingClubClaims"] });
    },
    onError: (error: Error) => {
      Alert.alert("Action Failed", error.message);
    },
  });

  const handleClaimResponse = (
    claimId: string,
    newStatus: "approved" | "rejected"
  ) => {
    const user = supabase.auth.getUser();
    user.then(({ data: { user } }) => {
      if (!user) {
        Alert.alert("Error", "You must be logged in to perform this action.");
        return;
      }
      claimResponseMutation.mutate({
        claimId,
        newStatus,
        reviewerId: user.id,
      });
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (isError) {
    return (
      <View style={styles.centered}>
        <StyledText color={theme.colors.error}>{error.message}</StyledText>
        <StyledButton variant="link" onPress={() => refetch()}>
          Try Again
        </StyledButton>
      </View>
    );
  }

  return (
    <FlatList
      data={claims}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <StyledText variant="titleMedium" alignCenter>
          Pending Club Claims
        </StyledText>
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <StyledText>No pending club claims.</StyledText>
        </View>
      }
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <StyledText variant="titleSmall">
              Club: {item.club?.name || "Unknown"}
            </StyledText>
            <StyledText>
              Requested on: {new Date(item.requested_at).toLocaleDateString()}
            </StyledText>
            <StyledText>
              Claim by: {item.claimant?.username || "Unknown User"}
            </StyledText>
            <StyledText>
              Reason: "{item.claim_details || "No details"}"
            </StyledText>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <StyledButton
              variant="outline"
              size="small"
              onPress={() => handleClaimResponse(item.id, "rejected")}
              disabled={claimResponseMutation.isPending}
              textColor={theme.colors.error}
            >
              Reject
            </StyledButton>
            <StyledButton
              onPress={() => handleClaimResponse(item.id, "approved")}
              disabled={claimResponseMutation.isPending}
              size="small"
            >
              Approve
            </StyledButton>
          </Card.Actions>
        </Card>
      )}
    />
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    card: {
      marginHorizontal: 16,
      marginVertical: 8,
      backgroundColor: theme.colors.surface,
    },
    cardContent: {
      gap: theme.spacing.small,
    },
    cardActions: { justifyContent: "flex-end" },
  });

export default ManageClubClaimsScreen;
