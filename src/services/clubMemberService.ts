// src/services/clubMemberService.ts
import { supabase } from "../lib/supabase"; // Adjust path

// --- Types for function parameters ---

interface ClubMembershipPayload {
  userId: string;
  clubId: string;
}

interface JoinRequestPayload extends ClubMembershipPayload {
  message?: string; // Optional message when requesting to join
}

// --- Service Functions ---

/**
 * Allows a user to join a public club.
 * RLS Policy "Users can join public clubs as members." on `club_members` table will be enforced by Supabase.
 * @param {ClubMembershipPayload} payload - Contains userId and clubId.
 */
export const joinPublicClub = async ({
  userId,
  clubId,
}: ClubMembershipPayload) => {
  console.log(
    `[clubMemberService] User ${userId} joining public club ${clubId}`
  );
  const { data, error } = await supabase.from("club_members").insert({
    club_id: clubId,
    user_id: userId,
    role: "member", // Users always join as a 'member' by default
  });

  if (error) {
    console.error("[clubMemberService] joinPublicClub error:", error);
    // RLS violation or other DB error will be caught here
    throw error;
  }
  return data;
};

/**
 * Allows a user to leave a club they are a member of.
 * RLS Policy "Users can leave clubs they are a member of." on `club_members` will be enforced.
 * This will be used in ClubSettingsScreen.tsx.
 * @param {ClubMembershipPayload} payload - Contains userId and clubId.
 */
export const leaveClub = async ({ userId, clubId }: ClubMembershipPayload) => {
  console.log(`[clubMemberService] User ${userId} leaving club ${clubId}`);
  const { data, error } = await supabase
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("user_id", userId);

  if (error) {
    console.error("[clubMemberService] leaveClub error:", error);
    throw error;
  }
  return data;
};

/**
 * Allows a user to request to join a controlled club.
 * RLS Policy "Users can create join requests for controlled clubs." on `club_join_requests` will be enforced.
 * @param {JoinRequestPayload} payload - Contains userId, clubId, and an optional message.
 */
export const requestToJoinClub = async ({
  userId,
  clubId,
  message,
}: JoinRequestPayload) => {
  console.log(
    `[clubMemberService] User ${userId} requesting to join controlled club ${clubId}`
  );
  const { data, error } = await supabase.from("club_join_requests").insert({
    club_id: clubId,
    user_id: userId,
    status: "pending",
    message: message || null, // Ensure message is null if not provided
  });

  if (error) {
    // This will catch RLS violations, e.g., if user already has a pending request or is already a member.
    console.error("[clubMemberService] requestToJoinClub error:", error);
    throw error;
  }
  return data;
};
