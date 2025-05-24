// src/screens/App/SubmitReviewScreen.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Button,
  TextInput,
  Text,
  HelperText,
  ActivityIndicator,
  Snackbar,
  useTheme,
  Title,
} from "react-native-paper";
// For star rating, we can use SegmentedButtons for 1-5 or a simple number input.
// Or you can install a dedicated star rating component library.
// For simplicity here, let's use SegmentedButtons for rating 1-5.
import { SegmentedButtons } from "react-native-paper";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../navigation/types"; // Adjust path
import { supabase } from "../../lib/supabase"; // Adjust path

type Props = NativeStackScreenProps<
  MainAppStackParamList,
  "SubmitReviewScreen"
>;

const ratingOptions = [
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
];

const SubmitReviewScreen = ({ route, navigation }: Props) => {
  const { clubId, clubName, existingReview } = route.params;
  const theme = useTheme();

  const [rating, setRating] = useState<string>(
    existingReview?.rating?.toString() || ""
  ); // Stored as string for SegmentedButtons
  const [comment, setComment] = useState(existingReview?.comment || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [currentUserAuthId, setCurrentUserAuthId] = useState<string | null>(
    null
  );

  useEffect(() => {
    navigation.setOptions({
      title: existingReview
        ? `Edit Review: ${clubName}`
        : `Review: ${clubName}`,
    });
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserAuthId(user.id);
      else {
        setError("Not authenticated!");
        Alert.alert("Error", "You must be logged in to leave a review.");
      }
    };
    getUserId();
  }, [navigation, clubName, existingReview]);

  const handleSubmitReview = async () => {
    if (!currentUserAuthId) {
      Alert.alert("Error", "Could not verify user. Please re-login.");
      return;
    }
    if (!rating) {
      setError("Please select a rating.");
      return;
    }

    const numericRating = parseInt(rating, 10);
    if (isNaN(numericRating) || numericRating < 0 || numericRating > 5) {
      // Assuming 0 is allowed if not using SegmentedButtons starting at 1
      setError("Invalid rating value.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const reviewData = {
      // id: existingReview?.reviewId, // Only include for true update if your upsert needs it explicitly
      club_id: clubId,
      user_id: currentUserAuthId,
      rating: numericRating,
      comment: comment.trim() || null, // Set to null if empty string
      updated_at: new Date().toISOString(), // Supabase handles created_at, trigger handles updated_at on actual update
    };

    // If it's a new review, don't send 'id'. If it's an update, include 'id'.
    // Supabase upsert with onConflict handles this well by matching on unique constraint.
    const upsertData: any = { ...reviewData };
    if (existingReview?.reviewId) {
      upsertData.id = existingReview.reviewId;
    }

    try {
      const { error: upsertError } = await supabase
        .from("club_reviews")
        .upsert(upsertData, {
          onConflict: "user_id, club_id", // Based on our UNIQUE constraint
          // defaultToNull: false, // If you want unspecified fields in upsertData to not set columns to null
        });

      if (upsertError) {
        if (
          upsertError.message.includes("violates row-level security policy")
        ) {
          setError(
            "Submission failed: You must be a member of this club to leave a review, or you're trying to edit someone else's review."
          );
        } else if (
          upsertError.message.includes(
            'violates unique constraint "unique_user_club_review"'
          )
        ) {
          // This shouldn't happen with upsert if onConflict is correct, but good to be aware
          setError(
            "You've already submitted a review for this club. Try editing it."
          );
        } else {
          throw upsertError;
        }
      } else {
        setSnackbarMessage(
          existingReview
            ? "Review updated successfully!"
            : "Review submitted successfully!"
        );
        setSnackbarVisible(true);
        setTimeout(() => {
          if (navigation.canGoBack()) navigation.goBack();
        }, 1500);
      }
    } catch (e: any) {
      console.error("Error submitting review:", e);
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUserAuthId && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error && !isSubmitting && !currentUserAuthId) {
    // Persistent error if no auth
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error }}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>
        {existingReview ? "Edit Your Review" : "Write a Review"} for {clubName}
      </Title>

      <Text style={styles.label}>Your Rating (1-5 stars)*</Text>
      <SegmentedButtons
        value={rating}
        onValueChange={setRating}
        buttons={ratingOptions.map((opt) => ({
          value: opt.value,
          label: opt.label,
          icon: parseInt(opt.value) >= 3 ? "star" : "star-outline",
        }))}
        style={styles.input}
      />

      <TextInput
        label="Your Comment (optional)"
        value={comment}
        onChangeText={setComment}
        mode="outlined"
        style={[styles.input, styles.textArea]}
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
        onPress={handleSubmitReview}
        loading={isSubmitting}
        disabled={isSubmitting || !rating}
        style={styles.button}
        icon={existingReview ? "content-save-edit" : "send"}
      >
        {isSubmitting
          ? "Submitting..."
          : existingReview
          ? "Update Review"
          : "Submit Review"}
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
  container: { padding: 20, paddingBottom: 40, flexGrow: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { textAlign: "center", marginBottom: 20 },
  input: { marginBottom: 15 },
  textArea: { height: 120, textAlignVertical: "top" },
  label: { fontSize: 16, marginBottom: 8, marginTop: 10, fontWeight: "600" },
  button: { marginTop: 20, paddingVertical: 8 },
  errorText: { textAlign: "center" },
});

export default SubmitReviewScreen;
