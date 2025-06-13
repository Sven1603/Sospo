// src/screens/App/ClubReviewsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import {
  Text,
  ActivityIndicator,
  Card,
  Title,
  Paragraph,
  Avatar,
  useTheme,
  Divider,
  Button,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types"; // Adjust path if needed
import { supabase } from "../../../lib/supabase"; // Adjust path if needed
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"; // For star icons
import { useFocusEffect } from "@react-navigation/native"; // To refresh on focus
import { ProfileStub } from "../../../types/commonTypes";

// Type for a single review item with reviewer profile
export type ReviewItem = {
  id: string; // review id
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string; // Reviewer's user_id
  profiles: ProfileStub | null; // Profile might be null if user deleted or join issue
};

type Props = NativeStackScreenProps<MainAppStackParamList, "ClubReviewsScreen">;

const ClubReviewsScreen = ({ route, navigation }: Props) => {
  const { clubId, clubName, averageRating, reviewCount } = route.params;
  const theme = useTheme();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserAuthId, setCurrentUserAuthId] = useState<string | null>(
    null
  );

  const [currentUserReview, setCurrentUserReview] = useState<ReviewItem | null>(
    null
  );
  const [isMember, setIsMember] = useState(false);
  const [loadingUserStatus, setLoadingUserStatus] = useState(true);

  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserAuthId(user.id);
      } else {
        setLoadingUserStatus(false);
      }
    };
    getUserId();
  }, []);

  const fetchReviews = useCallback(async () => {
    if (!clubId) {
      setError("Club ID is missing.");
      setLoading(false);
      return;
    }
    console.log(`Workspaceing reviews for clubId: ${clubId}`);

    setLoading(true);
    if (currentUserAuthId) setLoadingUserStatus(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("club_reviews")
        .select(
          `
          id,
          rating,
          comment,
          created_at,
          user_id,
          profiles!club_reviews_user_id_fkey (username, avatar_url)
        `
        )
        .eq("club_id", clubId)
        .order("created_at", { ascending: false }); // Newest reviews first

      if (fetchError) throw fetchError;

      if (data) {
        console.log("Fetched reviews: ", data.length);
        setReviews(data as unknown as ReviewItem[]);
      } else {
        setReviews([]);
      }

      // If user is logged in, fetch their specific review and membership status for this club
      if (currentUserAuthId) {
        // Fetch current user's review for this club
        const { data: userReviewData, error: userReviewError } = await supabase
          .from("club_reviews")
          .select(
            `id, rating, comment, created_at, user_id, profiles!inner(username, avatar_url)`
          ) // Ensure profiles is fetched if needed for ReviewItem
          .eq("club_id", clubId)
          .eq("user_id", currentUserAuthId)
          .maybeSingle();
        if (userReviewError)
          console.error(
            "Error fetching current user's review:",
            userReviewError.message
          );
        setCurrentUserReview(userReviewData as ReviewItem | null);

        // Check if current user is a member of this club
        const { data: membershipData, error: membershipError } = await supabase
          .from("club_members")
          .select("user_id")
          .eq("club_id", clubId)
          .eq("user_id", currentUserAuthId)
          .maybeSingle();
        if (membershipError)
          console.error("Error checking membership:", membershipError.message);
        setIsMember(!!membershipData);
      } else {
        setCurrentUserReview(null);
        setIsMember(false);
      }
    } catch (e: any) {
      console.error("Error fetching club reviews:", e);
      setError(e.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
      setLoadingUserStatus(false);
      setRefreshing(false);
    }
  }, [clubId, currentUserAuthId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true); // Show loader when screen focuses and data is fetched
      fetchReviews();
    }, [fetchReviews])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReviews();
  }, [fetchReviews]);

  const renderStarRating = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <MaterialCommunityIcons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={20}
          color={
            i <= rating ? theme.colors.primary : theme.colors.onSurfaceDisabled
          } // Adjust colors as needed
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderReviewItem = ({ item }: { item: ReviewItem }) => (
    <Card style={styles.reviewCard}>
      <Card.Content>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewerInfo}>
            {item.profiles?.avatar_url ? (
              <Avatar.Image
                size={40}
                source={{ uri: item.profiles.avatar_url }}
              />
            ) : (
              <Avatar.Text
                size={40}
                label={
                  item.profiles?.username?.substring(0, 2).toUpperCase() ||
                  item.user_id.substring(0, 2).toUpperCase() ||
                  "??"
                }
                style={{ backgroundColor: theme.colors.secondaryContainer }}
                color={theme.colors.onSecondaryContainer}
              />
            )}
            <View style={styles.reviewerText}>
              <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
                {item.profiles?.username || "A member"}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          {renderStarRating(item.rating)}
        </View>
        {item.comment && item.comment.trim() !== "" && (
          <Paragraph style={styles.commentText}>{item.comment}</Paragraph>
        )}
      </Card.Content>
      {currentUserReview && ( // Show Edit button only for the user's own review
        <Card.Actions style={{ justifyContent: "flex-end" }}>
          <Button
            icon="pencil-outline"
            onPress={() =>
              navigation.navigate("SubmitReviewScreen", {
                clubId,
                clubName,
                existingReview: {
                  // Pass the full review data for editing
                  reviewId: item.id,
                  rating: item.rating,
                  comment: item.comment,
                },
              })
            }
          >
            Edit Your Review
          </Button>
        </Card.Actions>
      )}
    </Card>
  );

  if (loading && reviews.length === 0) {
    // Show full screen loader only on initial load
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{ marginTop: 10 }}>Loading reviews...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error }}>{error}</Text>
        <Button onPress={fetchReviews}>Try Again</Button>
      </View>
    );
  }

  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => item.id}
      renderItem={renderReviewItem}
      ListHeaderComponent={
        <View style={styles.listHeaderContainer}>
          <Title style={styles.mainTitle}>Reviews for {clubName}</Title>
          {averageRating !== null &&
          averageRating !== undefined &&
          reviewCount !== null &&
          reviewCount &&
          reviewCount > 0 ? (
            <View style={styles.summaryContainer}>
              {renderStarRating(Math.round(averageRating))}
              <Text style={styles.summaryAverageText}>
                {Number(averageRating).toFixed(1)} average rating
              </Text>
              <Text style={styles.summaryCountText}>
                ({reviewCount} review{reviewCount === 1 ? "" : "s"})
              </Text>
            </View>
          ) : (
            <Text style={styles.noReviewsText}>
              No reviews yet for this club.
            </Text>
          )}
          <Divider style={{ marginTop: 10, marginBottom: 5 }} />
          {reviews.length > 0 && (
            <Text variant="labelLarge" style={styles.reviewsSectionTitle}>
              All Reviews
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        !loading && reviews.length === 0 ? ( // Only show if not loading and reviews truly empty
          <View style={styles.centered}>
            <Text>Be the first to review this club!</Text>
            {/* Optionally add a button here to navigate to SubmitReviewScreen if user is a member and hasn't reviewed */}
          </View>
        ) : null
      }
      contentContainerStyle={styles.listContentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  listHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  summaryContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  summaryAverageText: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
    marginRight: 4,
  },
  summaryCountText: { fontSize: 16, color: "black" },
  noReviewsText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
    color: "black",
  },
  reviewsSectionTitle: {
    marginTop: 10,
    marginBottom: 5,
    fontSize: 16,
    fontWeight: "bold",
  },
  listContentContainer: { paddingBottom: 20 },
  reviewCard: { marginHorizontal: 16, marginVertical: 8, elevation: 1 },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewerInfo: { flexDirection: "row", alignItems: "center" },
  avatar: { marginRight: 10 },
  reviewerText: { justifyContent: "center" },
  starsContainer: { flexDirection: "row" },
  commentText: { marginTop: 8, fontSize: 15, lineHeight: 22 },
});

export default ClubReviewsScreen;
