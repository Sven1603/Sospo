import { ImagePickerAsset } from "expo-image-picker";
import { supabase } from "../lib/supabase";
import {
  ClubJoinRequestStub,
  ClubReviewStub,
  DetailedClub,
  ListedClub,
  UpdateClubPayload,
} from "../types/clubTypes";
import { SportTypeStub } from "../types/commonTypes";
import { processSingleNestedRelation } from "./utils";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";

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

/**
 * Fetches all clubs the current user is a member of (but not admin/contributor).
 * Calls the `get_my_member_clubs` RPC.
 */
export const fetchMyMemberClubs = async (): Promise<ListedClub[]> => {
  console.log(`[clubService] Fetching member-of clubs for current user...`);

  // 1. Get the list of relevant club rows from the RPC
  const { data: clubRows, error: rpcError } = await supabase.rpc(
    "get_my_member_clubs"
  );

  if (rpcError) {
    console.error("[clubService] fetchMyMemberClubs RPC error:", rpcError);
    throw rpcError;
  }
  if (!clubRows || clubRows.length === 0) {
    return [];
  }

  const clubIds = clubRows.map((club: { id: string }) => club.id);

  // 2. Fetch the rich details for the identified clubs
  const { data, error } = await supabase
    .from("clubs")
    .select(
      `
      id, name, location_text, cover_image_url, privacy,
      club_members ( count ),
      club_sport_types ( sport_types!inner ( id, name ) )
    `
    )
    .in("id", clubIds)
    .order("name", { ascending: true }); // Order alphabetically

  if (error) {
    console.error(
      "[clubService] fetchMyMemberClubs data fetching error:",
      error
    );
    throw error;
  }

  // 3. Process the data to match the ListedClub type
  return (data || []).map((club: any) => {
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
      member_count: memberCount,
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

/**
 * Uploads a new cover image for a club and updates the club's record.
 * @param clubId The ID of the club.
 * @param file The local file URI from the image picker.
 */
export const uploadClubCoverImage = async ({
  clubId,
  file,
}: {
  clubId: string;
  file: ImagePickerAsset;
}) => {
  // 1. Fetch the image data as a blob
  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: "base64",
  });

  if (file.fileSize === 0)
    throw new Error("Failed to read image file, fileSize is 0.");

  // 2. Generate a unique file path
  const fileExtension = file.uri.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${clubId}/cover.${fileExtension}?t=${new Date().getTime()}`;

  // 3. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("club-images")
    .upload(filePath, decode(base64), {
      cacheControl: "3600",
      upsert: true,
      contentType: file.mimeType || "image/jpeg",
    });
  if (uploadError) throw uploadError;

  // 4. Get the public URL
  const { data: urlData } = supabase.storage
    .from("club-images")
    .getPublicUrl(filePath.split("?")[0]);
  const publicUrl = urlData.publicUrl;
  if (!publicUrl) throw new Error("Could not get public URL for cover image.");

  // 5. Update the 'clubs' table with the new URL
  const { error: updateError } = await supabase
    .from("clubs")
    .update({
      cover_image_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clubId);
  if (updateError) throw updateError;

  return publicUrl;
};

/**
 * Updates a club's core details and associated sport types.
 * Calls the `update_club_details_and_sports` RPC in Supabase.
 * @param {UpdateClubPayload} payload - The data for the club update.
 */
export const updateClub = async (payload: UpdateClubPayload) => {
  console.log(`[clubService] Updating club ${payload.clubId}...`);

  // The parameter keys here (p_club_id, p_name, etc.) MUST exactly match
  // the parameter names in your PostgreSQL function definition.
  const rpcParams = {
    p_club_id: payload.clubId,
    p_club_name: payload.name,
    p_club_description: payload.description,
    p_club_location_text: payload.location_text,
    p_club_privacy: payload.privacy,
    p_club_cover_image_url: payload.cover_image_url,
    p_new_selected_sport_type_ids: payload.selected_sport_type_ids, // Ensure this name matches your DB function
  };

  const { data, error } = await supabase.rpc(
    "update_club_details_and_sports",
    rpcParams
  );

  if (error) {
    console.error("[clubService] updateClub error:", error);
    // The RLS policy and BEFORE UPDATE trigger on the 'clubs' table will be
    // enforced by this RPC call, and will throw an error if a rule is violated
    // (e.g., a contributor trying to change privacy).
    throw error;
  }

  return data;
};

interface SubmitClubClaimPayload {
  userId: string;
  clubId: string;
  claimDetails: string;
}

/**
 * Submits a new claim request for an unowned club.
 * RLS policies on the `club_claim_requests` table will be enforced by Supabase.
 */
export const submitClubClaim = async (payload: SubmitClubClaimPayload) => {
  console.log(
    `[clubRequestService] User ${payload.userId} submitting claim for club ${payload.clubId}`
  );

  const { data, error } = await supabase
    .from("club_claim_requests")
    .insert({
      user_id: payload.userId,
      club_id: payload.clubId,
      claim_details: payload.claimDetails,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    // This will catch RLS violations, e.g., if the club is already owned
    // or if the user has already submitted a claim.
    console.error("[clubRequestService] submitClubClaim error:", error);
    throw error;
  }

  return data;
};

/**
 * Fetches all clubs managed by the current user (where they are admin or contributor).
 * @param {string} userId - The ID of the currently authenticated user.
 */
export const fetchMyManagedClubs = async (
  userId: string
): Promise<ListedClub[]> => {
  if (!userId) return []; // Return empty array if no user is logged in
  console.log(`[clubService] Fetching managed clubs for user ${userId}...`);

  const { data, error } = await supabase
    .from("club_members")
    .select(
      `
      clubs!inner (
        id,
        name,
        location_text,
        cover_image_url,
        privacy,
        club_members ( count ),
        club_sport_types ( sport_types!inner ( id, name ) )
      )
    `
    )
    .eq("user_id", userId)
    .in("role", ["admin", "contributor"]); // The key filter for managed clubs

  if (error) {
    console.error("[clubService] fetchMyManagedClubs error:", error);
    throw error;
  }

  if (!data) {
    return [];
  }

  // The query returns an array of { clubs: { ... } }, so we need to map it
  return data
    .map((item: any) => {
      const club = item.clubs;
      if (!club) return null; // Should not happen with an inner join, but good practice

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
        member_count: memberCount,
        club_sport_types: (club.club_sport_types || [])
          .map((cst: any) => ({
            sport_types: processSingleNestedRelation(
              cst.sport_types
            ) as SportTypeStub | null,
          }))
          .filter((cst: any) => cst.sport_types !== null),
      };
    })
    .filter(Boolean) as ListedClub[]; // filter(Boolean) removes any null entries
};
