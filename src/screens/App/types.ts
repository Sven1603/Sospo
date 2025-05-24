// Define a type for the Club data we expect
export type SportTypeStub = {
  id: string;
  name: string;
};

export type Club = {
  id: string; // UUID
  name: string;
  description: string | null;
  privacy: "public" | "private" | "controlled";
  location_text: string | null;
  cover_image_url: string | null;
  created_at: string;
  club_sport_types: Array<{
    sport_types: SportTypeStub[] | null; //Expect an array of SportTypeStub
  }> | null;
  // member_count?: number; // For future enhancement
};

export type ProfileStub = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export type ClubMember = {
  role: "admin" | "member" | "contributor";
  // profiles: ProfileStub | null; // If fetching profile directly linked
  user_id: string; // Keep user_id to link to profiles data if fetched separately or for other logic
  member_profile?: ProfileStub | null; // For profile data fetched via join
};

export type DetailedClub = {
  id: string;
  name: string;
  description: string | null;
  privacy: "public" | "private" | "controlled";
  location_text: string | null;
  cover_image_url: string | null;
  created_at: string;
  is_verified_listing?: boolean; // From our clubs table
  created_by: string | null; // Owner's user ID
  // Nested data from joins
  created_by_profile?: {
    username: string | null;
    avatar_url: string | null;
  } | null; // Profile of the owner
  club_sport_types: Array<{ sport_types: SportTypeStub | null }> | null;
  club_members: ClubMember[] | null;
};

export type JoinRequest = {
  id: string;
  club_id: string;
  user_id: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null; // New field
  requester_profile: ProfileStub | null;
  reviewer_profile: ProfileStub | null;
};
