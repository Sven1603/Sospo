// src/screens/App/ClubDetailScreen.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  ActivityIndicator,
  Chip,
  Button,
  Snackbar,
  IconButton,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import { supabase } from "../../../lib/supabase";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import StyledText from "../../../components/ui/StyledText";
import { AppTheme, useAppTheme } from "../../../theme/theme";
import IconText from "../../../components/ui/IconText";
import AvatarList from "../../../components/ui/AvatarList";
import StyledFAB from "../../../components/ui/StyledFAB";
import { DetailedClub } from "../../../types/clubTypes";
import { SportTypeStub } from "../../../types/commonTypes";
import StyledButton from "../../../components/ui/StyledButton";
import { SafeAreaView } from "react-native-safe-area-context";
import StyledIconButton from "../../../components/ui/IconButton";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { fetchClubDetails } from "../../../services/clubService";
import {
  joinPublicClub,
  requestToJoinClub,
} from "../../../services/clubMemberService";

type Props = NativeStackScreenProps<
  MainAppStackParamList,
  "ClubDetail",
  "CreateEvent"
>;

const ClubDetailScreen = ({ route, navigation }: Props) => {
  const { clubId } = route.params;
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const queryClient = useQueryClient();

  const [currentUserAuthId, setCurrentUserAuthId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserAuthId(user?.id || null);
    };
    getUserId();
  }, []);

  const {
    data: club,
    isLoading: isLoadingClub,
    isError: isClubError,
    error: clubFetchError,
    refetch: refetchClubDetails,
    isRefetching,
  } = useQuery<DetailedClub | null, Error>({
    queryKey: ["clubDetails", clubId, currentUserAuthId],
    queryFn: () => fetchClubDetails(clubId, currentUserAuthId),
    enabled: !!clubId && currentUserAuthId !== undefined,
  });

  const userRelationship = useMemo(() => {
    if (!currentUserAuthId || !club)
      return {
        isOwner: false,
        isAdmin: false,
        isContributor: false,
        isMember: false,
      };
    const isOwner = club.created_by === currentUserAuthId;
    const membership = club.club_members?.find(
      (m) => m.user_id === currentUserAuthId
    );
    return {
      isOwner,
      isAdmin: membership?.role === "admin",
      isContributor: membership?.role === "contributor",
      isMember: !!membership,
    };
  }, [club, currentUserAuthId]);

  // Set header options dynamically
  useLayoutEffect(() => {
    if (club) {
      navigation.setOptions({
        title: club.name || "Club Details",
        headerRight: () => (
          <IconButton
            icon="cog-outline"
            size={26}
            onPress={() =>
              navigation.navigate("ClubSettings", {
                clubId: club.id,
                clubName: club.name || "Club",
              })
            }
            iconColor={theme.colors.onSurface}
          />
        ),
      });
    }
  }, [navigation, club, theme.colors.onSurface]);

  // --- Mutations for Club Actions ---
  const joinClubMutation = useMutation({
    mutationFn: joinPublicClub, // Assumes this function exists in clubMemberService.ts
    onSuccess: () => {
      // Invalidate club details and user's club list to refetch
      queryClient.invalidateQueries({ queryKey: ["clubDetails", clubId] });
      queryClient.invalidateQueries({ queryKey: ["myClubs"] });
      Alert.alert("Success", "You have joined the club!");
    },
    onError: (error: Error) => Alert.alert("Error Joining Club", error.message),
  });

  const requestToJoinMutation = useMutation({
    mutationFn: requestToJoinClub, // Assumes this function exists in clubMemberService.ts
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["clubDetails", clubId, currentUserAuthId],
      });
      Alert.alert("Success", "Your request to join has been sent.");
    },
    onError: (error: Error) => Alert.alert("Request Failed", error.message),
  });

  const handleJoinClub = () => {
    if (!currentUserAuthId || !clubId) return;
    joinClubMutation.mutate({ userId: currentUserAuthId, clubId: clubId });
  };

  const handleRequestToJoin = () => {
    if (!currentUserAuthId || !clubId) return;
    requestToJoinMutation.mutate({ userId: currentUserAuthId, clubId: clubId });
  };

  // --- Render Logic ---
  if (isLoadingClub) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{ marginTop: 10 }}>Loading Club...</Text>
      </View>
    );
  }
  if (isClubError) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error }}>
          Error: {clubFetchError.message}
        </Text>
        <Button onPress={() => refetchClubDetails()}>Try Again</Button>
      </View>
    );
  }
  if (!club) {
    return (
      <View style={styles.centered}>
        <Text>Club not found.</Text>
      </View>
    );
  }

  // // --- Primary Action Button for Non-Members ---
  // let primaryActionContent = null;
  // if (currentUserAuthId && !userRelationship.isMember) {
  //   if (club.privacy === 'public') {
  //     primaryActionContent = <Button mode="contained" icon="plus-circle-outline" onPress={handleJoinClub} loading={joinClubMutation.isPending} disabled={joinClubMutation.isPending} style={styles.primaryActionButton}>Join Club</Button>;
  //   } else if (club.privacy === 'controlled') {
  //     if (club.currentUserPendingJoinRequest) {
  //       primaryActionContent = <Chip icon="clock-outline" style={styles.statusChip}>Request Pending</Chip>;
  //     } else {
  //       primaryActionContent = <Button mode="contained-tonal" icon="account-plus-outline" onPress={handleRequestToJoin} loading={requestToJoinMutation.isPending} disabled={requestToJoinMutation.isPending} style={styles.primaryActionButton}>Request to Join</Button>;
  //     }
  //   }
  // }

  const memberProfiles = club.club_members?.map((member) => member.profiles);

  return (
    <SafeAreaView style={styles.outerContainerForFab}>
      <ScrollView style={styles.scrollView}>
        {club.cover_image_url ? (
          <Image
            source={{ uri: club.cover_image_url }}
            style={styles.coverContainer}
          />
        ) : (
          <View
            style={[
              styles.coverContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.coverNavigation}>
              <StyledIconButton
                icon="chevron-left"
                variant="plain"
                onPress={navigation.goBack}
              />
              <StyledIconButton // TODO: show only when admin or contributor
                icon="cog-outline"
                variant="plain"
                onPress={() =>
                  navigation.navigate("ClubSettings", {
                    clubId: club.id,
                    clubName: club.name || "Club",
                  })
                }
              />
            </View>
            <StyledText variant="titleLarge">{club.name}</StyledText>
            {club.location_text && (
              <StyledText variant="bodyMedium">{club.location_text}</StyledText>
            )}
            <View style={styles.coverDetails}>
              <AvatarList profiles={memberProfiles} />
              <IconText
                icon={club.privacy === "public" ? "earth" : "eye-outline"}
                label={club.privacy}
              />
            </View>
          </View>
        )}

        <View style={styles.contentContainer}>
          {club.review_count !== null && club.review_count > 0 ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("ClubReviewsScreen", {
                  clubId: club.id,
                  clubName: club.name,
                  averageRating: club.average_rating,
                  reviewCount: club.review_count,
                })
              }
              style={styles.ratingContainer}
            >
              <MaterialCommunityIcons
                name="star"
                size={20}
                color={theme.colors.primary}
              />
              <Text
                style={[styles.ratingText, { color: theme.colors.primary }]}
              >
                {Number(club.average_rating).toFixed(1)}
              </Text>
              <Text style={styles.reviewCountText}>
                ({club.review_count} review{club.review_count === 1 ? "" : "s"})
              </Text>
            </TouchableOpacity>
          ) : (
            // Optionally show "No reviews yet" or nothing if no reviews
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("ClubReviewsScreen", {
                  clubId: club.id,
                  clubName: club.name,
                  averageRating: null,
                  reviewCount: 0,
                })
              }
              style={styles.ratingContainer} // So user can still navigate to see if they can add one
            >
              <Text style={styles.reviewCountText}>
                No reviews yet. Be the first!
              </Text>
            </TouchableOpacity>
          )}

          {club.description && (
            <View>
              <StyledText variant="titleMedium">About</StyledText>
              <StyledText>{club.description}</StyledText>
            </View>
          )}

          <View style={styles.chipContainer}>
            {club.club_sport_types?.map((cst, index) => {
              const sportName = cst.sport_types?.name;
              const sportId = cst.sport_types?.id;
              return sportName && sportId ? (
                <Chip
                  key={sportId + index}
                  icon="tag-outline"
                  style={styles.chip}
                >
                  {sportName}
                </Chip>
              ) : null;
            })}
          </View>
        </View>
      </ScrollView>
      {(userRelationship.isOwner ||
        userRelationship.isAdmin ||
        userRelationship.isContributor) && (
        <StyledFAB
          icon="calendar-plus"
          label="Create Event"
          onPress={() => {
            if (club) {
              navigation.navigate("EventWizardScreen", {
                clubId: club.id,
                clubName: club.name,
              });
            }
          }}
          visible={!isLoadingClub}
        />
      )}
    </SafeAreaView>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scrollView: { flex: 1 },
    coverContainer: {
      position: "relative",
      height: 240,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.x_small,
    },
    coverDetails: {
      display: "flex",
      flexDirection: "row",
      width: "100%",
      position: "absolute",
      bottom: theme.spacing.medium,
      justifyContent: "space-between",
      paddingHorizontal: theme.padding.large,
    },
    coverNavigation: {
      display: "flex",
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-between",
      position: "absolute",
      top: theme.spacing.medium,
      paddingHorizontal: theme.padding.large,
    },
    contentContainer: { padding: 20 },
    actionButton: { marginTop: 16, marginBottom: 16 },
    divider: { marginVertical: 16 },
    chipContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginVertical: theme.spacing.small,
    },
    chip: { marginRight: 8, marginBottom: 8 },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    ratingContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      marginTop: 4, // Adjust as needed
    },
    ratingText: {
      fontSize: 16,
      fontWeight: "bold",
      marginLeft: 4,
      color: theme.colors.primary,
    },
    reviewCountText: {
      fontSize: 14,
      marginLeft: 6,
      color: "gray",
    },
    reviewActionContainer: {
      marginVertical: 10,
      alignItems: "center", // Center the button
    },
    reviewButton: {
      // width: '80%', // Or some appropriate width
    },
    outerContainerForFab: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  });

export default ClubDetailScreen;
