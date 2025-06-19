// src/services/eventService.ts
import { supabase } from "../lib/supabase"; // Adjust path to your Supabase client
import { ProfileStub, SportTypeStub } from "../types/commonTypes";
import type {
  ListedEvent,
  DetailedEventData,
  EventJoinRequestData,
  EventRow,
} from "../types/eventTypes"; // Adjust path to your centralized event types

// Helper to consistently process Supabase's nested relation data
// Supabase might return a direct object for a to-one join, or an array containing one object.
const processSingleNestedRelation = <T>(
  relationData: T | T[] | null | undefined
): T | null => {
  if (!relationData) return null;
  if (Array.isArray(relationData)) {
    return relationData.length > 0 ? relationData[0] : null;
  }
  return relationData; // It's already a single object
};

/**
 * Fetches a list of upcoming events, intended for general display.
 * Applies RLS for visibility.
 */
export const fetchUpcomingEvents = async (): Promise<ListedEvent[]> => {
  console.log("[eventService] Fetching upcoming events...");
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id, name, description, start_time, end_time, location_text, cover_image_url, 
      club_id, privacy, max_participants,
      host_club:clubs ( name ),
      event_participants ( count ),
      event_sport_types ( sport_types ( id, name ) )
    `
    )
    .gte("start_time", now) // Only upcoming or ongoing
    .order("start_time", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[eventService] fetchUpcomingEvents error:", error.message);
    throw error;
  }

  return (data || []).map((event: any) => ({
    id: event.id,
    name: event.name,
    description: event.description,
    start_time: event.start_time,
    end_time: event.end_time,
    location_text: event.location_text,
    cover_image_url: event.cover_image_url,
    club_id: event.club_id,
    privacy: event.privacy,
    max_participants: event.max_participants,
    host_club_name: processSingleNestedRelation(event.host_club)?.name || null,
    participant_count:
      event.event_participants && event.event_participants.length > 0
        ? event.event_participants[0].count
        : 0,
    event_sport_types: (event.event_sport_types || [])
      .map((est: any) => ({
        sport_types: processSingleNestedRelation(
          est.sport_types
        ) as SportTypeStub | null,
      }))
      .filter((est: any) => est.sport_types !== null),
  })) as ListedEvent[];
};

/**
 * Fetches detailed information for a single event.
 */
export const fetchEventDetails = async (
  eventId: string,
  userId?: string | null
): Promise<DetailedEventData | null> => {
  if (!eventId) {
    console.warn("[eventService] fetchEventDetails called with no eventId");
    return null;
  }
  console.log(`[eventService] Fetching details for event ${eventId}`);
  const { data: rawEventData, error } = await supabase
    .from("events")
    .select(
      `
        *, 
        creator_profile:profiles!events_created_by_user_id_fkey (id, username, avatar_url),
        host_club:clubs!events_club_id_fkey (id, name),
        event_sport_types ( sport_types!inner (id, name) ),
        event_participants ( user_id, status, profiles!inner (id, username, avatar_url) )
    `
    )
    .eq("id", eventId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Standard "Row not found"
    console.error("[eventService] fetchEventDetails error:", error.message);
    throw error;
  }
  if (!rawEventData) return null;

  let currentUserPendingJoinRequest: EventJoinRequestData | null = null;
  if (userId && rawEventData.privacy === "controlled") {
    const { data: requestData, error: requestError } = await supabase
      .from("event_join_requests")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();
    if (requestError)
      console.error(
        "Error fetching user's pending join request:",
        requestError
      );
    if (requestData) {
      currentUserPendingJoinRequest = requestData as EventJoinRequestData;
    }
  }

  const fe = rawEventData as any;

  // Process nested structures robustly
  const processedCreatorProfile = processSingleNestedRelation(
    fe.creator_profile
  ) as ProfileStub | null;
  const processedHostClub = processSingleNestedRelation(fe.host_club) as {
    id: string;
    name: string;
  } | null;

  const processedSportTypes = (fe.event_sport_types || [])
    .map((est: any) => ({
      sport_types: processSingleNestedRelation(
        est.sport_types
      ) as SportTypeStub | null,
    }))
    .filter((est: any) => est.sport_types !== null);

  const processedParticipants = (fe.event_participants || []).map((p: any) => ({
    user_id: p.user_id,
    status: p.status,
    profiles: processSingleNestedRelation(p.profiles) as ProfileStub | null,
  }));

  return {
    id: fe.id,
    name: fe.name,
    description: fe.description,
    start_time: fe.start_time,
    end_time: fe.end_time,
    location_text: fe.location_text,
    latitude: fe.latitude,
    longitude: fe.longitude,
    map_derived_address: fe.map_derived_address,
    privacy: fe.privacy,
    club_id: fe.club_id,
    created_by_user_id: fe.created_by_user_id,
    max_participants: fe.max_participants,
    cover_image_url: fe.cover_image_url,
    is_recurring: fe.is_recurring, // This field was removed from 'events' table, was for pattern.
    // series_id indicates it was part of a recurring creation.
    series_id: fe.series_id, // Make sure 'events' table has series_id
    recurrence_rule: fe.recurrence_rule, // Not stored on individual instances anymore
    series_end_date: fe.series_end_date, // Not stored on individual instances anymore
    sport_specific_attributes: fe.sport_specific_attributes,
    created_at: fe.created_at,
    creator_profile: processedCreatorProfile,
    host_club: processedHostClub,
    event_sport_types:
      processedSportTypes.length > 0 ? processedSportTypes : null,
    event_participants: processedParticipants,
    currentUserPendingJoinRequest: currentUserPendingJoinRequest,
  } as DetailedEventData;
};

interface RsvpPayload {
  eventId: string;
  userId: string;
  status: "attending" | "interested" | "declined";
}
export const rsvpToEvent = async ({ eventId, userId, status }: RsvpPayload) => {
  console.log(
    `[eventService] User ${userId} RSVPing to event ${eventId} as ${status}`
  );
  const { data, error } = await supabase.from("event_participants").upsert(
    {
      event_id: eventId,
      user_id: userId,
      status: status,
      // registered_at will be set by default or can be omitted if not needed in upsert
    },
    { onConflict: "event_id, user_id" }
  );

  if (error) {
    console.error("[eventService] rsvpToEvent error:", error.message);
    throw error;
  }
  return data;
};

export const upsertRsvpStatus = async ({
  eventId,
  userId,
  status,
}: RsvpPayload) => {
  console.log(
    `[eventService] User ${userId} upserting RSVP to event ${eventId} as ${status}`
  );
  const { data, error } = await supabase.from("event_participants").upsert(
    {
      event_id: eventId,
      user_id: userId,
      status: status,
    },
    { onConflict: "event_id, user_id" }
  );

  if (error) throw error;
  return data;
};

export const deleteRsvp = async ({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) => {
  console.log(
    `[eventService] User ${userId} deleting RSVP from event ${eventId}`
  );
  const { data, error } = await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) throw error;
  return data;
};

// --- Stubs for other event service functions (to be implemented fully later) ---

// Type for parameters expected by the 'create_event_and_link_sports' RPC
// This should align with your EventFormData after transformation
export type CreateEventParams = {
  p_name: string;
  p_description: string | null;
  p_first_occurrence_start_time: string; // ISO string
  p_first_occurrence_end_time: string | null; // ISO string
  p_location_text: string;
  p_latitude: number | null;
  p_longitude: number | null;
  p_map_derived_address: string | null;
  p_privacy: "public" | "private" | "controlled";
  p_club_id: string | null;
  p_max_participants: number | null;
  p_cover_image_url: string | null;
  p_selected_sport_type_ids: string[];
  p_is_actually_recurring: boolean;
  p_recurrence_pattern: string | null; // e.g., 'weekly', 'monthly'
  p_series_end_date: string | null; // YYYY-MM-DD
  p_sport_specific_attributes: Record<string, any> | null;
};

export const createEvent = async (
  params: CreateEventParams
): Promise<string | null> => {
  // Returns new event ID (first instance)
  console.log("[eventService] Creating event:", params.p_name);
  const { data: newEventId, error } = await supabase.rpc(
    "create_event_and_link_sports",
    params
  );
  if (error) {
    console.error("[eventService] createEvent error:", error.message);
    throw error;
  }
  return newEventId;
};

// Type for parameters for 'update_event_and_link_sports' RPC
export type UpdateEventParams = Omit<
  CreateEventParams,
  | "p_club_id"
  | "p_is_actually_recurring"
  | "p_recurrence_pattern"
  | "p_series_end_date"
  | "p_first_occurrence_start_time"
  | "p_first_occurrence_end_time" // These are not part of update for single instance
> & {
  p_event_id: string;
  // For single instance update, we send specific start/end times for that instance
  p_start_time: string; // ISO string for this instance
  p_end_time: string | null; // ISO string for this instance
  // p_new_selected_sport_type_ids is used instead of p_selected_sport_type_ids in DB func
  p_new_selected_sport_type_ids: string[];
};

export const updateEvent = async (params: UpdateEventParams): Promise<void> => {
  console.log("[eventService] Updating event:", params.p_event_id);
  // Map client param p_selected_sport_type_ids to p_new_selected_sport_type_ids if needed,
  // or ensure your DB function update_event_and_link_sports uses p_selected_sport_type_ids
  // My last update_event_and_link_sports function used p_selected_sport_type_ids.
  const rpcParams = {
    // Ensure these match the DB function params exactly
    p_event_id: params.p_event_id,
    p_name: params.p_name,
    p_description: params.p_description,
    p_start_time: params.p_start_time,
    p_end_time: params.p_end_time,
    p_location_text: params.p_location_text,
    p_latitude: params.p_latitude,
    p_longitude: params.p_longitude,
    p_map_derived_address: params.p_map_derived_address,
    p_privacy: params.p_privacy,
    p_max_participants: params.p_max_participants,
    p_cover_image_url: params.p_cover_image_url,
    p_selected_sport_type_ids: params.p_new_selected_sport_type_ids, // Use the correct name here
    p_sport_specific_attributes: params.p_sport_specific_attributes,
  };

  const { error } = await supabase.rpc(
    "update_event_and_link_sports",
    rpcParams
  );
  if (error) {
    console.error("[eventService] updateEvent error:", error.message);
    throw error;
  }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  console.log(`[eventService] Deleting event ${eventId}`);
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) {
    console.error("[eventService] deleteEvent error:", error.message);
    throw error;
  }
};

interface RequestToJoinPayload {
  eventId: string;
  userId: string;
  message?: string;
}
export const requestToJoinEvent = async ({
  eventId,
  userId,
  message,
}: RequestToJoinPayload) => {
  const { data, error } = await supabase.from("event_join_requests").insert({
    event_id: eventId,
    user_id: userId,
    message: message || null,
    status: "pending",
  });
  if (error) throw error;
  return data;
};

export const fetchMyUpcomingAttendingEvents = async (
  userId: string
): Promise<ListedEvent[]> => {
  if (!userId) return [];
  console.log(
    `[eventService] Fetching upcoming attending events for user ${userId}...`
  );
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("event_participants")
    .select(
      `
      events!inner (
        id, name, description, start_time, end_time, max_participants, location_text, cover_image_url, 
        club_id, privacy, max_participants,
        host_club:clubs ( name ),
        event_sport_types ( sport_types ( id, name ) )
      )
    `
    )
    .eq("user_id", userId)
    .eq("status", "attending")
    .gte("events.start_time", now) // Ensure the event itself is upcoming
    .order("start_time", { foreignTable: "events", ascending: true })
    .limit(10); // Limit for home screen display

  if (error) {
    console.error(
      "[eventService] fetchMyUpcomingAttendingEvents error:",
      error
    );
    throw error;
  }

  return (data || []).map((item: any) => {
    const event = item.events; // Data is nested under 'events'
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      start_time: event.start_time,
      location_text: event.location_text,
      cover_image_url: event.cover_image_url,
      club_id: event.club_id,
      privacy: event.privacy,
      max_participants: event.max_participants,
      host_club_name: event.host_club
        ? processSingleNestedRelation(event.host_club)?.name
        : null,
      event_sport_types: (event.event_sport_types || [])
        .map((est: any) => ({
          sport_types: processSingleNestedRelation(
            est.sport_types
          ) as SportTypeStub | null,
        }))
        .filter((est: any) => est.sport_types !== null),
    };
  }) as ListedEvent[];
};

/**
 * Fetches all events (both past and future) for a specific club.
 * @param clubId The ID of the club whose events are to be fetched.
 */
export const fetchEventsForClub = async (
  clubId: string
): Promise<ListedEvent[]> => {
  if (!clubId) return [];
  console.log(`[eventService] Fetching all events for club ${clubId}...`);

  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id, name, start_time, end_time, location_text, cover_image_url,
      sport_specific_attributes,
      event_participants ( count )
    `
    )
    .eq("club_id", clubId)
    .order("start_time", { ascending: false }); // Order by most recent first

  if (error) {
    console.error("[eventService] fetchEventsForClub error:", error);
    throw error;
  }

  if (!data) return [];

  return data.map((event: any) => ({
    id: event.id,
    name: event.name,
    description: event.description,
    start_time: event.start_time,
    location_text: event.location_text,
    cover_image_url: event.cover_image_url,
    club_id: event.club_id,
    privacy: event.privacy,
    max_participants: event.max_participants,
    host_club_name: event.host_club
      ? processSingleNestedRelation(event.host_club)?.name
      : null,
    event_sport_types: (event.event_sport_types || [])
      .map((est: any) => ({
        sport_types: processSingleNestedRelation(
          est.sport_types
        ) as SportTypeStub | null,
      }))
      .filter((est: any) => est.sport_types !== null),
  })) as ListedEvent[];
};

/**
 * Fetches all upcoming events organized by the current user.
 * This includes events they created directly or events hosted by clubs they are staff of.
 * Calls the `get_my_organized_events` RPC.
 */
export const fetchMyOrganizedEvents = async (): Promise<ListedEvent[]> => {
  console.log(`[eventService] Fetching organized events for current user...`);
  const now = new Date().toISOString();

  // Call the RPC to get the IDs of all events the user organizes
  const { data: eventRows, error: rpcError } = await supabase.rpc(
    "get_my_organized_events"
  );

  if (rpcError) {
    console.error("[eventService] fetchMyOrganizedEvents RPC error:", rpcError);
    throw rpcError;
  }

  // Cast the rpcData to our defined type to remove the 'any' type
  const rpcData = eventRows as EventRow[];

  if (!rpcData || rpcData.length === 0) {
    return [];
  }

  // Now TypeScript knows that `event` has an `id` property of type string.
  const eventIds = rpcData.map((event) => event.id);

  // Fetch the full details for the identified events
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id, name, description, start_time, end_time, location_text, cover_image_url, 
      club_id, privacy, max_participants,
      host_club:clubs ( name ),
      event_participants ( count ),
      event_sport_types ( sport_types ( id, name ) )
    `
    )
    .in("id", eventIds) // Fetch details for the events we identified
    .gte("start_time", now) // Filter for only upcoming ones
    .order("start_time", { ascending: true });

  if (error) {
    console.error(
      "[eventService] fetchMyOrganizedEvents data fetching error:",
      error
    );
    throw error;
  }

  // Process the data as we do in other fetchers
  return (data || []).map((event: any) => ({
    id: event.id,
    name: event.name,
    description: event.description,
    start_time: event.start_time,
    end_time: event.end_time,
    location_text: event.location_text,
    cover_image_url: event.cover_image_url,
    club_id: event.club_id,
    privacy: event.privacy,
    max_participants: event.max_participants,
    host_club_name: event.host_club
      ? processSingleNestedRelation(event.host_club)?.name
      : null,
    participant_count:
      event.event_participants && event.event_participants.length > 0
        ? event.event_participants[0].count
        : 0,
    event_sport_types: (event.event_sport_types || [])
      .map((est: any) => ({
        sport_types: processSingleNestedRelation(
          est.sport_types
        ) as SportTypeStub | null,
      }))
      .filter((est: any) => est.sport_types !== null),
  })) as ListedEvent[];
};

/**
 * Fetches all upcoming events a user is attending or interested in.
 * Calls the `get_my_attending_events` RPC.
 */
export const fetchMyAttendingEvents = async (): Promise<ListedEvent[]> => {
  console.log(`[eventService] Fetching ATTTENDING events for current user...`);

  // 1. Get the list of relevant event rows from the RPC
  const { data: eventRows, error: rpcError } = await supabase.rpc(
    "get_my_attending_events"
  );

  if (rpcError) {
    console.error("[eventService] fetchMyAttendingEvents RPC error:", rpcError);
    throw rpcError;
  }
  if (!eventRows || eventRows.length === 0) {
    return [];
  }

  const eventIds = eventRows.map((event: { id: string }) => event.id);

  // 2. Fetch the rich details for the identified events
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id, name, start_time, location_text, cover_image_url,
      host_club:clubs ( name ),
      event_participants ( count ),
      event_sport_types ( sport_types ( id, name ) )
    `
    )
    .in("id", eventIds)
    .order("start_time", { ascending: true });

  if (error) {
    console.error(
      "[eventService] fetchMyAttendingEvents data fetching error:",
      error
    );
    throw error;
  }

  // 3. Process the data (as before)
  return (data || []).map((event: any) => ({
    // ... mapping logic to return an array of ListedEvent
  })) as ListedEvent[];
};
