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

export const initialEventFormData: EventFormData = {
  eventName: "",
  description: "",
  selectedSportTypeIds: [],
  startTime: new Date(new Date().setHours(new Date().getHours() + 1, 0, 0, 0)),
  endTime: null,
  isRecurring: false,
  recurrencePattern: "none",
  seriesEndDate: null,
  sportSpecific_distance: "",
  sportSpecific_pace_minutes: "",
  sportSpecific_pace_seconds: "",
  locationText: "",
  latitude: null,
  longitude: null,
  map_derived_address: null,
  privacy: "public",
  maxParticipants: "",
  coverImageUrl: "",
};
