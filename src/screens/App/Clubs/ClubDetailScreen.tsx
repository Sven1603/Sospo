import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import { supabase } from "../../../lib/supabase";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import StyledText from "../../../components/ui/StyledText";
import { AppTheme, useAppTheme } from "../../../theme/theme";
import IconText from "../../../components/ui/IconText";
import AvatarList from "../../../components/ui/AvatarList";
import StyledFAB from "../../../components/ui/StyledFAB";
import { DetailedClub } from "../../../types/clubTypes";
import StyledButton from "../../../components/ui/StyledButton";
import { SafeAreaView } from "react-native-safe-area-context";
import StyledIconButton from "../../../components/ui/IconButton";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { fetchClubDetails } from "../../../services/clubService";
import {
  joinPublicClub,
  requestToJoinClub,
} from "../../../services/clubMemberService";
import { ListedEvent } from "../../../types/eventTypes";
import { fetchEventsForClub } from "../../../services/eventService";
import EventCard from "../../../components/ui/EventCard";
import StyledChip from "../../../components/ui/StyledChip";
import HorizontalListSection from "../../../components/ui/HorizontalListSection";

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
    queryKey: ["clubDetails", clubId],
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

  const { data: allClubEvents = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["clubEvents", clubId],
    queryFn: () => fetchEventsForClub(clubId),
    enabled: !!clubId,
  });

  // --- Use useMemo to split events into upcoming and past ---
  const { upcomingEvents, pastEvents } = useMemo((): {
    upcomingEvents: ListedEvent[];
    pastEvents: ListedEvent[];
  } => {
    const now = new Date();
    const upcoming: ListedEvent[] = [];
    const past: ListedEvent[] = [];

    for (const event of allClubEvents) {
      if (new Date(event.start_time) >= now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    }
    // Ensure upcoming are sorted ascending (soonest first)
    upcoming.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    // Past events are already sorted descending by the query
    return { upcomingEvents: upcoming, pastEvents: past };
  }, [allClubEvents]);

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
        <StyledText>Loading Club...</StyledText>
      </View>
    );
  }
  if (isClubError) {
    return (
      <View style={styles.centered}>
        <StyledText color={theme.colors.error}>
          Error: {clubFetchError.message}
        </StyledText>
        <StyledButton variant="outline" onPress={() => refetchClubDetails()}>
          Try Again
        </StyledButton>
      </View>
    );
  }
  if (!club) {
    return (
      <View style={styles.centered}>
        <StyledText>Club not found.</StyledText>
      </View>
    );
  }

  let primaryActionContent = null;
  if (club.created_by) {
    if (currentUserAuthId && !userRelationship.isMember) {
      if (club.privacy === "public") {
        primaryActionContent = (
          <StyledButton
            icon="plus-circle-outline"
            onPress={handleJoinClub}
            loading={joinClubMutation.isPending}
            disabled={joinClubMutation.isPending}
          >
            Join Club
          </StyledButton>
        );
      } else if (club.privacy === "controlled") {
        if (club.currentUserPendingJoinRequest) {
          primaryActionContent = (
            <StyledButton icon="clock-outline" variant="secondary" disabled>
              Request Pending
            </StyledButton>
          );
        } else {
          primaryActionContent = (
            <StyledButton
              icon="account-plus-outline"
              onPress={handleRequestToJoin}
              loading={requestToJoinMutation.isPending}
              disabled={requestToJoinMutation.isPending}
            >
              Request to Join
            </StyledButton>
          );
        }
      }
    }
  } else {
    primaryActionContent = (
      <StyledButton
        onPress={() =>
          navigation.navigate("ClaimClub", {
            clubId: club.id,
            clubName: club.name,
          })
        }
      >
        Claim club
      </StyledButton>
    );
  }

  const memberProfiles = club.club_members?.map(
    (member) => member.member_profile
  );

  const userHasEditRights =
    userRelationship.isAdmin ||
    userRelationship.isContributor ||
    userRelationship.isOwner;

  const getSportChipIcon = (sportName: string) => {
    switch (sportName) {
      case "Run":
        return "run";
      case "Swim":
        return "swim";
      case "Cycle":
        return "bike";
      default:
        return "";
    }
  };

  return (
    <SafeAreaView style={styles.outerContainerForFab}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.coverContainer}>
          <ImageBackground
            source={{
              uri:
                club.cover_image_url ??
                "https://cdn.pixabay.com/photo/2021/12/12/20/00/play-6865967_640.jpg",
            }}
            style={styles.coverContainer}
          >
            <View style={styles.coverOverlay}></View>
            <StyledText variant="titleLarge">{club.name}</StyledText>
            {club.location_text && (
              <StyledText variant="bodyMedium">{club.location_text}</StyledText>
            )}
            <View style={styles.coverNavigation}>
              <StyledIconButton
                icon="chevron-left"
                variant="plain"
                onPress={navigation.goBack}
              />
              {userHasEditRights && (
                <StyledIconButton
                  icon="cog-outline"
                  variant="plain"
                  onPress={() =>
                    navigation.navigate("ClubSettings", {
                      clubId: club.id,
                      clubName: club.name || "Club",
                    })
                  }
                />
              )}
            </View>
            <View style={styles.coverDetails}>
              <AvatarList profiles={memberProfiles} />
              <IconText
                icon={club.privacy === "public" ? "earth" : "eye-outline"}
                label={club.privacy}
              />
            </View>
          </ImageBackground>
        </View>

        <View>
          <View style={styles.contentContainer}>
            {primaryActionContent}

            {/* TODO: add review section and logic */}
            {/* {club.review_count !== null && club.review_count > 0 ? (
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
                <StyledText color={theme.colors.primary}>
                  {Number(club.average_rating).toFixed(1)}
                </StyledText>
                <StyledText>
                  ({club.review_count} review
                  {club.review_count === 1 ? "" : "s"})
                </StyledText>
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
                <StyledText>No reviews yet. Be the first!</StyledText>
              </TouchableOpacity>
            )} */}

            {club.description && (
              <View>
                <StyledText variant="titleMedium">About</StyledText>
                <View style={styles.chipContainer}>
                  {club.club_sport_types?.map((cst, index) => {
                    const sportName = cst.sport_types?.name;
                    const sportId = cst.sport_types?.id;
                    return sportName && sportId ? (
                      <StyledChip
                        key={sportId + index}
                        icon={getSportChipIcon(cst.sport_types.name)}
                      >
                        {sportName}
                      </StyledChip>
                    ) : null;
                  })}
                </View>
                <StyledText>{club.description}</StyledText>
              </View>
            )}
          </View>

          <HorizontalListSection
            title="Upcoming Events"
            data={upcomingEvents}
            renderItem={({ item }) => <EventCard event={item} />}
            keyExtractor={(item) => item.id}
            isLoading={isLoadingEvents}
            isError={false} // Error handling for this query can be added if needed
            error={null}
            // onSeeAllPress={() =>
            //   navigation.navigate("AppTabs", { screen: "Events" })
            // }
            emptyMessage="No upcoming events scheduled."
          />

          {/* --- Use the new component for Past Events --- */}
          <HorizontalListSection
            title="Past Events"
            data={pastEvents}
            renderItem={({ item }) => <EventCard event={item} />}
            keyExtractor={(item) => item.id}
            isLoading={isLoadingEvents}
            isError={false}
            error={null}
            // No "Show all" for past events for now
            emptyMessage="No past events yet."
          />
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
      backgroundColor: theme.colors.surface,
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
    coverOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.background,
      opacity: 0.5,
    },
    contentContainer: { padding: 16 },
    chipContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.x_small,
      gap: theme.spacing.small,
    },
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
      marginTop: 4,
    },
    reviewActionContainer: {
      marginVertical: 10,
      alignItems: "center",
    },
    outerContainerForFab: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    horizontalListContent: {
      paddingLeft: 16,
      paddingRight: 6,
    },
  });

export default ClubDetailScreen;
