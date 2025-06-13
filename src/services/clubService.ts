import { supabase } from "../lib/supabase";
import {
  ClubJoinRequestStub,
  ClubReviewStub,
  DetailedClub,
  ListedClub,
} from "../types/clubTypes";
import { SportTypeStub } from "../types/commonTypes";
import { processSingleNestedRelation } from "./utils";

export const fetchVisibleClubs = async (): Promise<ListedClub[]> => {
  console.log("[clubService] Fetching all visible clubs...");

  const { data, error } = await supabase
    .from("clubs")
    .select(
      `
      id,
      name,
      location_text,
      cover_image_url,
      privacy,
      club_members ( count ), 
      club_sport_types ( sport_types!inner ( id, name ) )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[clubService] fetchVisibleClubs error:", error);
    throw error;
  }

  if (!data) {
    return [];
  }

  // Process the raw data to match the ListedClub type
  return data.map((club: any) => {
    // Supabase returns the count as an array with a single object, e.g., [{ count: 10 }]
    const memberCount =
      club.club_members && club.club_members.length > 0
        ? club.club_members[0].count
        : 0;

    return {
      id: club.id,
      name: club.name,
      location_text: club.location_text,
      cover_image_url: club.cover_image_url,
      privacy: club.privacy,
      member_count: memberCount, // Add member count to the object
      club_sport_types: (club.club_sport_types || [])
        .map((cst: any) => ({
          sport_types: processSingleNestedRelation(
            cst.sport_types
          ) as SportTypeStub | null,
        }))
        .filter((cst: any) => cst.sport_types !== null),
    };
  }) as ListedClub[];
};

export const fetchMyClubs = async (userId: string): Promise<ListedClub[]> => {
  if (!userId) return [];
  console.log(`[clubService] Fetching clubs for user ${userId}...`);
  const { data, error } = await supabase
    .from("club_members")
    .select(
      `
      clubs!inner (
        id, name, location_text, cover_image_url, privacy,
        club_sport_types ( sport_types ( id, name ) )
      )
    `
    )
    .eq("user_id", userId)
    // Optionally filter by role if needed, e.g., .in('role', ['admin', 'member', 'contributor'])
    .limit(10); // Limit for home screen

  if (error) {
    console.error("[clubService] fetchMyClubs error:", error);
    throw error;
  }
  return (data || []).map((item: any) => {
    const club = item.clubs; // Data is nested under 'clubs'
    return {
      id: club.id,
      name: club.name,
      location_text: club.location_text,
      cover_image_url: club.cover_image_url,
      privacy: club.privacy,
      club_sport_types: (club.club_sport_types || [])
        .map((cst: any) => ({
          sport_types: processSingleNestedRelation(
            cst.sport_types
          ) as SportTypeStub | null,
        }))
        .filter((cst: any) => cst.sport_types !== null),
      member_count: club.member_count,
    };
  }) as ListedClub[];
};

/**
 * Fetches all detailed information for a single club, including user-specific
 * context like their review or pending join request if a userId is provided.
 * @param clubId The ID of the club to fetch.
 * @param currentAuthUserId The ID of the currently logged-in user (optional).
 */
export const fetchClubDetails = async (
  clubId: string,
  currentAuthUserId?: string | null
): Promise<DetailedClub | null> => {
  if (!clubId) {
    console.warn("[clubService] fetchClubDetails called with no clubId");
    return null;
  }
  console.log(
    `[clubService] Fetching details for club ${clubId} for user ${currentAuthUserId}`
  );

  // --- 1. Define all queries ---
  // Main query for generic club data
  const mainClubQuery = supabase
    .from("clubs")
    .select(
      `
      *,
      owner_profile:profiles!clubs_created_by_fkey (id, username, avatar_url),
      club_sport_types ( sport_types!inner (id, name) ),
      club_members ( role, user_id, member_profile:profiles!club_members_user_id_fkey (id, username, avatar_url) ),
      club_rating_summary!left ( average_rating, review_count, comment_count )
    `
    )
    .eq("id", clubId)
    .single();

  // Query for the current user's review (only if user is logged in)
  const userReviewQuery = currentAuthUserId
    ? supabase
        .from("club_reviews")
        .select("id, rating, comment")
        .eq("club_id", clubId)
        .eq("user_id", currentAuthUserId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  // Query for the current user's pending join request (only if user is logged in)
  const userJoinRequestQuery = currentAuthUserId
    ? supabase
        .from("club_join_requests")
        .select("id, status")
        .eq("club_id", clubId)
        .eq("user_id", currentAuthUserId)
        .eq("status", "pending")
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  // --- 2. Execute all queries in parallel ---
  const [
    { data: rawClubData, error: clubError },
    { data: userReviewData, error: reviewError },
    { data: joinRequestData, error: joinRequestError },
  ] = await Promise.all([mainClubQuery, userReviewQuery, userJoinRequestQuery]);

  // --- 3. Handle Errors & Process Data ---
  if (clubError) {
    if (clubError.code === "PGRST116") return null; // Standard "Row not found" is not an error
    console.error(
      "[clubService] fetchClubDetails error (main query):",
      clubError.message
    );
    throw clubError;
  }
  if (!rawClubData) return null; // No club found
  // Log non-critical errors for user-specific data but don't fail the whole function
  if (reviewError)
    console.warn(
      "[clubService] fetchClubDetails warning (review query):",
      reviewError.message
    );
  if (joinRequestError)
    console.warn(
      "[clubService] fetchClubDetails warning (join request query):",
      joinRequestError.message
    );

  const fc = rawClubData as any; // Raw fetched club for easier processing
  const ratingSummary = processSingleNestedRelation(fc.club_rating_summary);

  const detailedClub: DetailedClub = {
    id: fc.id,
    name: fc.name,
    location_text: fc.location_text,
    cover_image_url: fc.cover_image_url,
    privacy: fc.privacy,
    description: fc.description,
    created_by: fc.created_by,
    is_verified_listing: fc.is_verified_listing,
    owner_profile: processSingleNestedRelation(fc.owner_profile),
    average_rating: ratingSummary?.average_rating || 0,
    review_count: ratingSummary?.review_count || 0,
    comment_count: ratingSummary?.comment_count || 0,
    club_sport_types: (fc.club_sport_types || [])
      .map((cst: any) => ({
        sport_types: processSingleNestedRelation(cst.sport_types),
      }))
      .filter((cst: any) => cst.sport_types),
    club_members: (fc.club_members || []).map((m: any) => ({
      ...m,
      member_profile: processSingleNestedRelation(m.member_profile), // Correctly handles nested profile
    })),
    // Attach the user-specific data to the final object
    currentUserReview: userReviewData as ClubReviewStub | null,
    currentUserPendingJoinRequest:
      joinRequestData as ClubJoinRequestStub | null,
  };

  return detailedClub;
};
