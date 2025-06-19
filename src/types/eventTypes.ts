// src/types/eventTypes.ts
import type { ProfileStub, SportTypeStub } from "./commonTypes";
import type { ClubPrivacy, ClubRole } from "./clubTypes"; // Reusing ClubPrivacy

// ENUMs (mirroring your database ENUMs)
export type EventParticipationStatus =
  | "attending"
  | "interested"
  | "declined"
  | "waitlisted";
// Using RequestStatus from clubTypes for event join requests ('pending', 'approved', 'rejected')
import type { RequestStatus } from "./clubTypes";

// Main Event Types
export type EventParticipant = {
  user_id: string;
  status: EventParticipationStatus;
  registered_at?: string; // ISO timestamp
  profiles: ProfileStub | null; // Processed nested profile data
};

export type ListedEvent = {
  id: string;
  name: string;
  description: string | null; // Keep it short for lists
  start_time: string; // ISO string
  end_time: string | null; // ISO string
  location_text: string | null;
  cover_image_url: string | null;
  club_id: string | null;
  privacy: ClubPrivacy; // Reusing ClubPrivacy ENUM
  max_participants: number | null;
  host_club_name?: string | null; // From joined clubs table
  // Processed sport types
  event_sport_types: Array<{ sport_types: SportTypeStub | null }> | null;
  participant_count?: number;
};

export type DetailedEventData = ListedEvent & {
  // Extends ListedEvent
  latitude: number | null;
  longitude: number | null;
  map_derived_address: string | null;
  created_by_user_id: string;
  is_recurring: boolean; // Was this from the event pattern? Now each row is an instance.
  // Let's keep it simple: if series_id is present, it was part of a recurrence.
  series_id: string | null; // UUID linking recurring instances
  // recurrence_rule and series_end_date are not stored on individual instances.
  sport_specific_attributes: Record<string, any> | null; // JSONB
  created_at: string; // ISO timestamp
  creator_profile: ProfileStub | null;
  event_participants: EventParticipant[] | null;
  currentUserPendingJoinRequest?: EventJoinRequestData | null;
};

// Request Type for Events
export type EventJoinRequest = {
  id: string;
  event_id: string;
  user_id: string;
  message: string | null;
  status: RequestStatus; // Reusing from clubTypes
  requested_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null; // UUID of event organizer/club staff who reviewed
  // Potentially join profile of user_id and reviewer_id
  requester_profile?: ProfileStub | null; // User requesting to join
  // events?: { name: string } | null; // Event being joined
};

export type EventJoinRequestData = {
  // Simplified for display
  id: string;
  status: "pending"; // We only care about pending for this UI state
};

export type EventRow = {
  id: string;
  // Add other direct columns from 'events' table if you need to access them here
};

// Note: EventFormData for the create/edit wizard can remain in its own folder
// (e.g., src/screens/App/Events/EventForm/eventForm.types.ts) as it's very specific to that form's state.
// The types above are more for data fetched from/sent to services.
