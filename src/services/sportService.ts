// src/services/sportService.ts
import { supabase } from "../lib/supabase"; // Adjust path if necessary
import type { SportTypeStub } from "../types/commonTypes"; // Adjust path if necessary

/**
 * Fetches a list of all available sport types, ordered by name.
 */
export const fetchAllSportTypes = async (): Promise<SportTypeStub[]> => {
  console.log("[sportService] Fetching all sport types...");

  const { data, error } = await supabase
    .from("sport_types")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("[sportService] fetchAllSportTypes error:", error);
    throw error; // Let TanStack Query handle the error
  }

  return data || []; // Return the data or an empty array if null
};
