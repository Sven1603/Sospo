import { supabase } from "../lib/supabase";
import { processSingleNestedRelation } from "./utils";

/**
 * Fetches all pending club claim requests for the app admin.
 */
export const fetchPendingClubClaims = async () => {
  console.log(`[clubRequestService] Fetching all pending club claims...`);

  const { data, error } = await supabase
    .from("club_claim_requests")
    .select(
      `
      id,
      claim_details,
      requested_at,
      user_id,
      claimant:profiles!club_claim_requests_user_id_fkey ( username, avatar_url ),
      club:clubs ( name )
    `
    )
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error) {
    console.error("[clubRequestService] fetchPendingClubClaims error:", error);
    throw error;
  }
  if (!data) return [];

  // Process data to flatten nested relations
  return data.map((item) => ({
    ...item,
    claimant: processSingleNestedRelation(item.claimant),
    club: processSingleNestedRelation(item.club),
  }));
};

/**
 * Responds to a club claim request (approve or reject).
 */
interface RespondToClubClaimPayload {
  claimId: string;
  reviewerId: string;
  newStatus: "approved" | "rejected";
}
export const respondToClubClaim = async (
  payload: RespondToClubClaimPayload
) => {
  console.log(
    `[clubRequestService] Admin ${payload.reviewerId} responding to claim ${payload.claimId} with status ${payload.newStatus}`
  );

  const { data, error } = await supabase
    .from("club_claim_requests")
    .update({
      status: payload.newStatus,
      reviewed_at: new Date().toISOString(),
      reviewer_id: payload.reviewerId,
    })
    .eq("id", payload.claimId)
    .select()
    .single();

  if (error) {
    console.error("[clubRequestService] respondToClubClaim error:", error);
    throw error;
  }
  return data;
};
