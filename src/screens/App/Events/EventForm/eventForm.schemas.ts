// src/screens/App/CreateEventForm/eventForm.schemas.ts
import { z } from "zod";

export const chooseSportTypesSchema = z.object({
  selectedSportTypeIds: z
    .array(z.string().uuid("Invalid sport ID."))
    .min(1, "Please select at least one sport type."),
});

export const setEventLocationSchema = z.object({
  latitude: z
    .number({ required_error: "Please select a location on the map." })
    .min(-90, "Invalid latitude.")
    .max(90, "Invalid latitude."),
  longitude: z
    .number({ required_error: "Please select a location on the map." })
    .min(-180, "Invalid longitude.")
    .max(180, "Invalid longitude."),
  map_derived_address: z.string().nullable().optional(), // This will be auto-populated
  locationText: z
    .string()
    .trim()
    .max(255, "Location details max 255 chars.")
    .optional()
    .nullable(), // Optional additional details
});

export const setEventDateTimeSchema = z
  .object({
    startTime: z.date({
      required_error: "Start date and time are required.",
      invalid_type_error: "Invalid start date/time.",
    }),
    endTime: z.date().nullable().optional(), // Optional, can be null
    isRecurring: z.boolean(),
    recurrencePattern: z.enum(["none", "weekly", "monthly"], {
      // This error applies if the field is required and not 'none' when isRecurring is true
      errorMap: (issue, ctx) => {
        if (
          issue.code === z.ZodIssueCode.invalid_enum_value &&
          (ctx.data as any)?.isRecurring &&
          (ctx.data as any)?.recurrencePattern === "none"
        ) {
          return {
            message:
              "Please select a recurrence pattern (e.g., Weekly, Monthly) if the event is recurring.",
          };
        }
        return { message: ctx.defaultError };
      },
    }),
    seriesEndDate: z.date().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate endTime is after startTime
    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after the start time.",
      });
    }

    // If recurring, a pattern other than 'none' must be selected
    if (data.isRecurring && data.recurrencePattern === "none") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrencePattern"],
        message: "Please select a recurrence pattern (e.g., Weekly, Monthly).",
      });
    }

    // If not recurring, seriesEndDate should ideally be null
    if (
      !data.isRecurring &&
      data.seriesEndDate !== null &&
      data.seriesEndDate !== undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seriesEndDate"],
        message: "Recurrence end date should only be set for recurring events.",
      });
    }

    // If recurring and recurrenceEndDate is set, it must be after startTime
    if (
      data.isRecurring &&
      data.seriesEndDate &&
      data.startTime &&
      data.seriesEndDate < data.startTime
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrenceEndDate"],
        message: "Recurrence end date must be after the event start time.",
      });
    }
  });

export const eventDetailsSchema = z
  .object({
    eventName: z
      .string()
      .trim()
      .min(1, "Event name is required.")
      .max(150, "Name max 150 chars."),
    description: z
      .string()
      .trim()
      .max(2000, "Description max 2000 chars.")
      .optional()
      .nullable(),

    maxParticipants: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine(
        (val) => {
          // val is string | null | undefined
          if (val == null || val.trim() === "") return true; // Optional, empty is fine
          return /^\d+$/.test(val); // If present, must be digits
        },
        { message: "Max participants must be a whole number if provided." }
      )
      .transform((val) => {
        // Output: number | null
        if (val == null || val.trim() === "") return null;
        const num = parseInt(val, 10);
        return isNaN(num) ? null : num; // Should be valid due to refine
      })
      .refine((val) => val === null || val > 0, {
        // If number, must be > 0
        message: "Max participants must be greater than 0 if specified.",
      })
      .nullable(), // Ensure final type can be null

    // Distance: Number only, always in kilometers for now (input as string, transformed to number)
    sportSpecific_distance: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (val == null || val.trim() === "") return true; // Optional, empty is fine
          return /^\d*\.?\d+$/.test(val.replace(",", ".")); // Allows numbers like "5", "10.5"
        },
        { message: "Distance must be a valid number (e.g., 5 or 10.5)." }
      )
      .transform((val) => {
        // Output: number | null
        if (val == null || val.trim() === "") return null;
        const num = parseFloat(val.replace(",", "."));
        return isNaN(num) ? null : num;
      })
      .refine((val) => val === null || val > 0, {
        // If number, must be > 0
        message: "Distance must be greater than 0 if specified.",
      })
      .nullable(),

    // Pace: min/km (input as minutes and seconds strings, transform to total seconds per km later in submit handler)
    sportSpecific_pace_minutes: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (val == null || val.trim() === "") return true; // Optional part of pace
          return (
            /^\d+$/.test(val) &&
            parseInt(val, 10) >= 0 &&
            parseInt(val, 10) <= 59
          );
        },
        { message: "Pace minutes must be a number between 0-59." }
      ),

    sportSpecific_pace_seconds: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (val == null || val.trim() === "") return true; // Optional part of pace
          return (
            /^\d+$/.test(val) &&
            parseInt(val, 10) >= 0 &&
            parseInt(val, 10) <= 59
          );
        },
        { message: "Pace seconds must be a number between 0-59." }
      ),

    privacy: z.enum(["public", "private", "controlled"], {
      required_error: "Privacy setting is required.",
    }),
    coverImageUrl: z
      .string()
      .trim()
      .url({ message: "Please enter a valid URL." })
      .optional()
      .nullable()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // Cross-field validation for pace
    const { sportSpecific_pace_minutes, sportSpecific_pace_seconds } = data;
    const minutesFilled =
      sportSpecific_pace_minutes && sportSpecific_pace_minutes.trim() !== "";
    const secondsFilled =
      sportSpecific_pace_seconds && sportSpecific_pace_seconds.trim() !== "";

    // If pace is entered, at least minutes or seconds should be valid (or both)
    // This logic might be too complex for Zod refine if one can be empty and other not.
    // Simpler: if one is filled, the other defaults to '0' if empty, then validate range.
    // For now, Zod validates them individually as 0-59 if provided.
    // We can add a check that if one pace field is provided, the other should also be valid or considered '0'.
    if (
      (minutesFilled &&
        !secondsFilled &&
        (parseInt(sportSpecific_pace_minutes!, 10) < 0 ||
          parseInt(sportSpecific_pace_minutes!, 10) > 59)) ||
      (!minutesFilled &&
        secondsFilled &&
        (parseInt(sportSpecific_pace_seconds!, 10) < 0 ||
          parseInt(sportSpecific_pace_seconds!, 10) > 59))
    ) {
      // This is a bit redundant as individual refines cover it.
    }
    if (
      minutesFilled &&
      secondsFilled &&
      parseInt(sportSpecific_pace_minutes!, 10) === 0 &&
      parseInt(sportSpecific_pace_seconds!, 10) === 0
    ) {
      // Allow 0:00 pace if it makes sense, or add a validation rule
    }
  });
