// src/screens/App/ClubDetailScreen.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
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
  Title,
  Paragraph,
  Divider,
  Avatar,
  useTheme,
  Snackbar,
  FAB,
  MD3Theme,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import { supabase } from "../../../lib/supabase";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { IconButton } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";

// Assuming types are defined here or imported (ensure these are correct)
export type SportTypeStub = { id: string; name: string };
export type ProfileStub = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};
export type ClubMember = {
  role: "admin" | "member" | "contributor";
  user_id: string;
  member_profile?: ProfileStub | null;
};
export type DetailedClub = {
  id: string;
  name: string;
  description: string | null;
  privacy: "public" | "private" | "controlled";
  location_text: string | null;
  cover_image_url: string | null;
  created_at: string;
  is_verified_listing?: boolean;
  created_by: string | null;
  owner_profile?: { username: string | null; avatar_url: string | null } | null;
  club_sport_types: Array<{
    sport_types: SportTypeStub | SportTypeStub[] | null;
  }> | null;
  club_members: ClubMember[] | null;
  average_rating: number | null;
  review_count: number | null;
  comment_count: number | null;
};

type Props = NativeStackScreenProps<
  MainAppStackParamList,
  "ClubDetail",
  "CreateEvent"
>;

const ClubDetailScreen = ({ route, navigation }: Props) => {
  const { clubId } = route.params;
  const theme = useTheme();
  const styles = getStyles(theme);

  const [club, setClub] = useState<DetailedClub | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // For Join/Request button
  const [error, setError] = useState<string | null>(null);
  const [currentUserAuthId, setCurrentUserAuthId] = useState<string | null>(
    null
  );

  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContributor, setIsContributor] = useState(false);
  const [isMember, setIsMember] = useState(false);

  const [hasPendingJoinRequest, setHasPendingJoinRequest] = useState(false);
  const [checkingJoinRequest, setCheckingJoinRequest] = useState(true);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // fetchClubDetails: Ensure this function correctly sets 'isMember' based on club.club_members
  const fetchClubDetails = useCallback(
    async (authId: string | null) => {
      console.log(
        "[ClubDetailScreen] Fetching details for clubId:",
        clubId,
        "Auth ID:",
        authId
      );
      setLoading(true);
      setError(null);
      try {
        const { data, error: clubError } = await supabase
          .from("clubs")
          .select(
            `
          id, name, description, privacy, location_text, cover_image_url, created_at, is_verified_listing, created_by,
          owner_profile:profiles!clubs_created_by_fkey (username, avatar_url),
          club_sport_types ( sport_types ( id, name ) ),
          club_members ( role, user_id, member_profile:profiles!club_members_user_id_fkey (id, username, avatar_url) ),
          club_rating_summary ( average_rating, review_count, comment_count )
        `
          )
          .eq("id", clubId)
          .single();

        if (clubError) throw clubError;

        if (data) {
          let avgRating = null;
          let revCount = 0;
          let cmtCount = 0;

          if (data.club_rating_summary) {
            const summary = Array.isArray(data.club_rating_summary)
              ? data.club_rating_summary[0]
              : data.club_rating_summary;
            if (summary) {
              avgRating = summary.average_rating;
              revCount = summary.review_count || 0;
              cmtCount = summary.comment_count || 0;
            }
          }
          const detailedClubData = {
            ...data,
            average_rating: avgRating,
            review_count: revCount,
            comment_count: cmtCount,
          } as any as DetailedClub;
          setClub(detailedClubData);

          // Determine user's roles/relationship
          let newIsMember = false;
          let newIsAdmin = false;
          let newIsContributor = false;
          let newIsOwner = false;

          if (authId) {
            newIsOwner = detailedClubData.created_by === authId;
            if (detailedClubData.club_members) {
              const membership = detailedClubData.club_members.find(
                (m) => m.user_id === authId
              );
              if (membership) {
                newIsMember = true;
                newIsAdmin = membership.role === "admin";
                newIsContributor = membership.role === "contributor";
              }
            }
          }
          setIsMember(newIsMember);
          setIsAdmin(newIsAdmin);
          setIsContributor(newIsContributor); // <<< SET THE STATE
          setIsOwner(newIsOwner);
        } else {
          setError("Club not found.");
          setIsMember(false);
          setIsAdmin(false);
          setIsContributor(false);
          setIsOwner(false);
        }
      } catch (e: any) {
        console.error("Error fetching club details:", e);
        setError(e.message || "Failed to load club details.");
        setIsMember(false);
      } finally {
        setLoading(false);
      }
    },
    [clubId]
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const getAuthUserAndFetchFocused = async () => {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!isActive) return;
        if (user) {
          setCurrentUserAuthId(user.id);
          await fetchClubDetails(user.id);
        } else {
          setError("User not authenticated.");
          setLoading(false);
        }
      };
      getAuthUserAndFetchFocused();
      return () => {
        isActive = false;
      };
    }, [fetchClubDetails])
  );

  // Effect to check for pending join requests for this user and club
  useEffect(() => {
    if (!club || !currentUserAuthId || isMember) {
      setCheckingJoinRequest(false);
      setHasPendingJoinRequest(false);
      return;
    }

    const checkPendingRequest = async () => {
      setCheckingJoinRequest(true);
      const { data, error } = await supabase
        .from("club_join_requests")
        .select("id")
        .eq("club_id", club.id)
        .eq("user_id", currentUserAuthId)
        .in("status", ["pending", "approved"]) // 'approved' means they are now a member, so should be caught by isMember
        .maybeSingle(); // Check if any such request exists

      if (error) {
        console.error("Error checking pending join request:", error);
      } else {
        setHasPendingJoinRequest(!!data);
      }
      setCheckingJoinRequest(false);
    };
    checkPendingRequest();
  }, [club, currentUserAuthId, isMember]);

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
          />
        ),
      });
    } else {
      navigation.setOptions({ title: "Club Details", headerRight: undefined });
    }
  }, [navigation, club]);

  // Ensure these functions also call fetchClubDetails(currentUserAuthId) on success to refresh.
  const handleJoinClub = async () => {
    if (!currentUserAuthId || !club || club.privacy !== "public") return;
    setActionLoading(true);
    setError(null);
    try {
      const { error: joinError } = await supabase.from("club_members").insert({
        club_id: club.id,
        user_id: currentUserAuthId,
        role: "member",
      });
      if (joinError) throw joinError;
      setSnackbarMessage(`Successfully joined ${club.name}!`);
      setSnackbarVisible(true);
      fetchClubDetails(currentUserAuthId); // Refresh
    } catch (e: any) {
      setError(e.message || "Failed to join club.");
      Alert.alert("Error", e.message || "Failed to join club.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestToJoin = async () => {
    if (!currentUserAuthId || !club) return;
    // TODO: Optionally open a modal to get a message from the user
    const joinMessage = ""; // Or from modal state

    setActionLoading(true);
    setError(null);
    try {
      const { error: requestError } = await supabase
        .from("club_join_requests")
        .insert({
          club_id: club.id,
          user_id: currentUserAuthId,
          message: joinMessage,
          status: "pending",
        });

      if (requestError) {
        if (
          requestError.message.includes("violates row-level security policy") ||
          requestError.message.includes("duplicate key")
        ) {
          // RLS already checks for existing pending/approved or being a member.
          setSnackbarMessage(
            "Could not send request. You might already be a member or have an active request."
          );
        } else {
          throw requestError;
        }
      } else {
        setSnackbarMessage("Join request sent successfully!");
        setHasPendingJoinRequest(true); // Update UI to show "Request Pending"
      }
      setSnackbarVisible(true);
    } catch (e: any) {
      console.error("Error requesting to join club:", e);
      setError(e.message || "Failed to send join request.");
      // Alert.alert('Error', e.message || 'Failed to send join request.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !club) {
    // Show full screen loader only if club data is not yet available at all
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{ marginTop: 10 }}>Loading club...</Text>
      </View>
    );
  }
  if (error && !club) {
    // Show full screen error only if club data failed to load initially
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error }}>{error}</Text>
        <Button
          onPress={() => fetchClubDetails(currentUserAuthId)}
          style={{ marginTop: 10 }}
        >
          Try Again
        </Button>
      </View>
    );
  }
  if (!club) {
    // Handles case where loading is false, no error, but club is still null (e.g. not found, or auth issue)
    return (
      <View style={styles.centered}>
        <Text>Club not found or unable to load.</Text>
        <Button
          onPress={() => fetchClubDetails(currentUserAuthId)}
          style={{ marginTop: 10 }}
        >
          Try Again
        </Button>
      </View>
    );
  }

  let primaryAction = null;
  if (!isMember && club) {
    // Only show these if user is NOT a member
    if (club.privacy === "public") {
      primaryAction = (
        <Button
          mode="contained"
          icon="plus-circle-outline"
          onPress={handleJoinClub}
          style={styles.actionButton}
          loading={actionLoading}
          disabled={actionLoading}
        >
          Join Club
        </Button>
      );
    } else if (club.privacy === "controlled") {
      if (checkingJoinRequest) {
        primaryAction = (
          <Button style={styles.actionButton} loading={true} disabled={true}>
            Checking Status...
          </Button>
        );
      } else if (hasPendingJoinRequest) {
        primaryAction = (
          <Button
            mode="outlined"
            icon="clock-outline"
            style={styles.actionButton}
            disabled={true}
          >
            Request Pending
          </Button>
        );
      } else {
        primaryAction = (
          <Button
            mode="contained-tonal"
            icon="account-plus-outline"
            onPress={handleRequestToJoin}
            style={styles.actionButton}
            loading={actionLoading}
            disabled={actionLoading}
          >
            Request to Join
          </Button>
        );
      }
    }
  }

  // Type adjustment for sport_types rendering due to previous TS error fix
  const getSportName = (
    sportTypeData: SportTypeStub | SportTypeStub[] | null
  ): string | null => {
    if (!sportTypeData) return null;
    if (Array.isArray(sportTypeData)) {
      return sportTypeData.length > 0 ? sportTypeData[0].name : null;
    }
    return sportTypeData.name;
  };
  const getSportId = (
    sportTypeData: SportTypeStub | SportTypeStub[] | null
  ): string | null => {
    if (!sportTypeData) return null;
    if (Array.isArray(sportTypeData)) {
      return sportTypeData.length > 0 ? sportTypeData[0].id : null;
    }
    return sportTypeData.id;
  };

  return (
    <View style={styles.outerContainerForFab}>
      <ScrollView style={styles.scrollView}>
        {club.cover_image_url ? (
          <Image
            source={{ uri: club.cover_image_url }}
            style={styles.coverImage}
          />
        ) : (
          <View
            style={[
              styles.coverImage,
              styles.placeholderCover,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />
        )}

        <View style={styles.contentContainer}>
          <Title style={styles.clubName}>{club.name}</Title>
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

          {club.location_text && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={styles.detailText}>{club.location_text}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name={
                club.privacy === "public"
                  ? "earth"
                  : club.privacy === "private"
                  ? "lock-outline"
                  : "account-eye-outline"
              }
              size={18}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={styles.detailText}>
              {club.privacy.charAt(0).toUpperCase() + club.privacy.slice(1)}{" "}
              Club
            </Text>
          </View>

          {primaryAction}

          <Divider style={styles.divider} />

          {club.description && (
            <>
              <Title style={styles.sectionTitle}>About</Title>
              <Paragraph>{club.description}</Paragraph>
              <Divider style={styles.divider} />
            </>
          )}

          <Title style={styles.sectionTitle}>Sport Types</Title>
          <View style={styles.chipContainer}>
            {club.club_sport_types?.map((cst, index) => {
              const sportName = getSportName(cst.sport_types);
              const sportId = getSportId(cst.sport_types);
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
          <Divider style={styles.divider} />

          <Title style={styles.sectionTitle}>
            Members ({club.club_members?.length || 0})
          </Title>
          <View style={styles.memberListContainer}>
            {club.club_members && club.club_members.length > 0
              ? club.club_members.slice(0, 10).map((member) => (
                  <View key={member.user_id} style={styles.memberItem}>
                    <Avatar.Text
                      size={40}
                      label={
                        member.member_profile?.username
                          ?.substring(0, 2)
                          .toUpperCase() ||
                        member.user_id.substring(0, 2).toUpperCase() ||
                        "??"
                      }
                      style={{
                        backgroundColor: theme.colors.secondaryContainer,
                      }}
                      color={theme.colors.onSecondaryContainer}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.member_profile?.username ||
                          `User ${member.user_id.substring(0, 6)}`}
                      </Text>
                      <Text style={styles.memberRole}>
                        {member.role.charAt(0).toUpperCase() +
                          member.role.slice(1)}
                      </Text>
                    </View>
                  </View>
                ))
              : // If RLS blocks members entirely, club_members array might be empty/null.
                club.privacy !== "public" &&
                !isMember && <Text>Membership details are private.</Text>}
          </View>
        </View>
      </ScrollView>
      {(isOwner || isAdmin || isContributor) && (
        <FAB
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          icon="calendar-plus"
          label="Create Event"
          color={theme.colors.onPrimary}
          onPress={() => {
            if (club) {
              navigation.navigate("CreateEventScreen", {
                clubId: club.id,
                clubName: club.name,
              });
            }
          }}
          visible={!loading}
        />
      )}

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
    scrollView: { flex: 1 },
    coverImage: { width: "100%", height: 200 },
    placeholderCover: { alignItems: "center", justifyContent: "center" },
    contentContainer: { padding: 20 },
    clubName: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
    detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    detailText: { marginLeft: 8, fontSize: 16 },
    actionButton: { marginTop: 16, marginBottom: 16 },
    divider: { marginVertical: 16 },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 10,
      marginTop: 8,
    },
    chipContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
    chip: { marginRight: 8, marginBottom: 8 },
    memberListContainer: {},
    memberItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    memberInfo: { marginLeft: 12 },
    memberName: { fontSize: 16, fontWeight: "bold" },
    memberRole: { fontSize: 14 },
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
    fab: {
      position: "absolute",
      margin: 16,
      right: 0,
      bottom: 0,
    },
  });

export default ClubDetailScreen;
