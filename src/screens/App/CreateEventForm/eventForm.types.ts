// src/screens/App/CreateEventForm/eventForm.types.ts
export type SportType = {
  id: string; // UUID
  name: string;
};

export type EventFormData = {
  eventName: string;
  description: string;
  selectedSportTypeIds: string[];
  startTime: Date | null;
  endTime: Date | null;
  isRecurring: boolean;
  recurrencePattern: "none" | "weekly" | "monthly";
  seriesEndDate: Date | null;
  sportSpecific_distance: string;
  sportSpecific_pace_minutes: string;
  sportSpecific_pace_seconds: string;
  locationText: string;
  latitude: number | null;
  longitude: number | null;
  map_derived_address: string | null;
  privacy: "public" | "private" | "controlled";
  maxParticipants: string;
  coverImageUrl: string;
};
