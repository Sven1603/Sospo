// In src/screens/App/Events/event.types.ts (or at top of EventDetailScreen.tsx)
export type SportTypeStub = {
  id: string;
  name: string;
};

export type ProfileStub = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export type EventParticipant = {
  user_id: string;
  status: "attending" | "interested" | "declined" | "waitlisted"; // From your ENUM
  profiles: ProfileStub | null; // For joined data, ensure processing for array/object
};

export type DetailedEventData = {
  id: string;
  name: string;
  description: string | null;
  start_time: string; // ISO string
  end_time: string | null; // ISO string
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  privacy: "public" | "private" | "controlled";
  club_id: string | null;
  created_by_user_id: string;
  max_participants: number | null;
  cover_image_url: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  recurrence_end_date: string | null; // Date string YYYY-MM-DD
  sport_specific_attributes: Record<string, any> | null; // JSONB
  created_at: string;

  // Joined data
  creator_profile: ProfileStub | null; // Processed from join
  host_club: { id: string; name: string } | null; // Processed from join

  // Processed to ensure sport_types is SportTypeStub | null inside each array element
  event_sport_types: Array<{ sport_types: SportTypeStub | null }> | null;
  event_participants: EventParticipant[] | null;
};

export type ListedEvent = {
  id: string; // UUID
  name: string;
  description: string | null;
  start_time: string; // ISO string
  location_text: string | null;
  cover_image_url: string | null;
  club_id: string | null; // To know if it's a club event
  // For joined sport types - assuming the structure from previous fixes
  event_sport_types: Array<{
    sport_types: SportTypeStub | SportTypeStub[] | null;
  }> | null;
};
