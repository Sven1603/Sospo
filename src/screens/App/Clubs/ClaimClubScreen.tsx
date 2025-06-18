// src/screens/App/Clubs/ClaimClubScreen.tsx
import React, { useState, useMemo } from "react";
import { View, StyleSheet, Alert, ScrollView } from "react-native";
import {
  TextInput,
  HelperText,
  Snackbar,
  useTheme,
  MD3Theme,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { MainAppStackParamList } from "../../../navigation/types";
import { AppTheme, useAppTheme } from "../../../theme/theme";
import StyledText from "../../../components/ui/StyledText";
import StyledButton from "../../../components/ui/StyledButton";
import { submitClubClaim } from "../../../services/clubService";
import StyledTextInput from "../../../components/ui/StyledTextInput";

type Props = NativeStackScreenProps<MainAppStackParamList, "ClaimClub">;

const ClaimClubScreen = ({ route, navigation }: Props) => {
  const { clubId, clubName } = route.params;
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [claimDetails, setClaimDetails] = useState("");
  const [errorText, setErrorText] = useState("");

  const submitClaimMutation = useMutation({
    mutationFn: submitClubClaim,
    onSuccess: () => {
      Alert.alert(
        "Request Submitted",
        "Your request to claim this club has been submitted for review. We will get back to you shortly.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: Error) => {
      // RLS policies will throw an error if the user is not allowed to claim.
      if (error.message.includes("violates row-level security policy")) {
        setErrorText(
          "Could not submit claim. The club may already be owned or you have a pending request."
        );
      } else {
        setErrorText(error.message);
      }
    },
  });

  const handleSubmit = () => {
    const user = supabase.auth.getUser();

    if (!claimDetails.trim()) {
      setErrorText("Please provide details for your claim.");
      return;
    }
    setErrorText("");

    user.then(({ data: { user } }) => {
      if (user) {
        submitClaimMutation.mutate({
          userId: user.id,
          clubId: clubId,
          claimDetails: claimDetails.trim(),
        });
      } else {
        Alert.alert("Error", "You must be logged in to claim a club.");
      }
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ rowGap: theme.spacing.medium }}
      keyboardShouldPersistTaps="handled"
    >
      <StyledText variant="titleLarge" alignCenter>
        Claim "{clubName}"
      </StyledText>

      <View>
        <StyledText>
          Please explain your connection to this club and why you should be the
          administrator.
        </StyledText>

        <StyledTextInput
          label="Claim Details"
          value={claimDetails}
          onChangeText={setClaimDetails}
          multiline
          numberOfLines={6}
          errorText={errorText}
        />
      </View>

      <StyledButton
        onPress={handleSubmit}
        loading={submitClaimMutation.isPending}
        disabled={submitClaimMutation.isPending}
        icon="check-circle-outline"
      >
        {submitClaimMutation.isPending
          ? "Submitting..."
          : "Submit Claim Request"}
      </StyledButton>
    </ScrollView>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
    },
  });

export default ClaimClubScreen;
