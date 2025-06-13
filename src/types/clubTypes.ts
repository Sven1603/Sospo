// src/types/clubTypes.ts
import type { ProfileStub, SportTypeStub } from "./commonTypes";

// ENUMs (mirroring your database ENUMs)
export type ClubPrivacy = "public" | "private" | "controlled";
export type ClubRole = "admin" | "member" | "contributor";
export type RequestStatus = "pending" | "approved" | "rejected"; // Generic for claim/join
export type AdminTransferRequestStatus =
  | "pending_new_admin_approval"
  | "approved_by_new_admin"
  | "rejected_by_new_admin"
  | "cancelled_by_current_admin";

// Main Club Types
export type ClubMember = {
  user_id: string;
  role: ClubRole;
  joined_at?: string; // ISO timestamp
  profiles: ProfileStub | null; // Processed nested profile data
};

export type ClubReviewData = {
  // For data coming from DB (e.g., with profile)
  id: string;
  club_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string | null;
  profiles: ProfileStub | null; // Reviewer's profile
};

export type ClubReviewStub = {
  id: string; // The ID of the review itself
  rating: number;
  comment: string | null;
};

export type ClubJoinRequestStub = {
  id: string; // The ID of the join request
  status: "pending"; // We only care about pending status for the button logic
};

export type ClubRatingSummary = {
  average_rating: number | null;
  review_count: number;
  comment_count: number;
};

export type ListedClub = {
  // For ClubListScreen
  id: string;
  name: string;
  location_text: string | null;
  cover_image_url: string | null;
  privacy: ClubPrivacy;
  // Processed sport types
  club_sport_types: Array<{ sport_types: SportTypeStub | null }> | null;
  // Optional: member_count if fetched efficiently for list view
  member_count?: number;
};

export type DetailedClub = ListedClub &
  ClubRatingSummary & {
    // Extends ListedClub and ClubRatingSummary
    description: string | null;
    created_by: string | null; // Owner's user ID
    is_verified_listing: boolean;
    owner_profile: ProfileStub | null; // Joined owner's profile
    club_members: ClubMember[] | null;
    currentUserReview?: ClubReviewStub | null;
    currentUserPendingJoinRequest?: ClubJoinRequestStub | null;
  };

// Request Types for Clubs
export type ClubClaimRequest = {
  id: string;
  club_id: string;
  user_id: string;
  claim_details: string | null;
  status: RequestStatus;
  requested_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  // Potentially join profile of user_id and reviewer_id if needed for display
  profiles?: ProfileStub | null; // User making the claim
  // clubs?: { name: string } | null; // Club being claimed
};

export type ClubJoinRequest = {
  id: string;
  club_id: string;
  user_id: string;
  message: string | null;
  status: RequestStatus;
  requested_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  // Potentially join profile of user_id and reviewer_id
  profiles?: ProfileStub | null; // User requesting to join
  // clubs?: { name: string } | null; // Club being joined
};

export type ClubAdminTransferRequest = {
  id: string;
  club_id: string;
  current_admin_user_id: string;
  proposed_new_admin_user_id: string;
  current_admin_new_role: "member" | "contributor";
  status: AdminTransferRequestStatus;
  requested_at: string;
  reviewed_at: string | null;
  // Potentially join profiles for current_admin and proposed_new_admin
  initiating_admin_profile?: ProfileStub | null;
  proposed_admin_profile?: ProfileStub | null;
  // clubs?: { name: string } | null;
};
