// src/services/profileService.ts
import { ImagePickerAsset } from "expo-image-picker";
import { supabase } from "../lib/supabase";
import type { UserProfile } from "../types/userTypes";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";

/**
 * Fetches a user's public profile data.
 */
export const fetchUserProfile = async (
  userId: string
): Promise<UserProfile | null> => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, updated_at, about_me")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Row not found is not a hard error
    console.error("[profileService] fetchUserProfile error:", error);
    throw error;
  }
  return data;
};

/**
 * Updates a user's profile text fields (username, full_name).
 */
type UpdateProfilePayload = {
  id: string;
  username: string;
  full_name: string | null;
  about_me: string | null;
};
export const updateUserProfile = async (
  profileUpdates: UpdateProfilePayload
) => {
  const { id, ...updates } = profileUpdates;
  (updates as any).updated_at = new Date().toISOString(); // Ensure updated_at is set

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[profileService] updateUserProfile error:", error);
    throw error;
  }
  return data;
};

/**
 * Uploads a new user avatar, updates the profile record, and returns the new public URL.
 */
export const uploadProfileAvatar = async ({
  userId,
  file,
}: {
  userId: string;
  file: ImagePickerAsset;
}): Promise<string> => {
  // 1. Convert file URI to a format Supabase can handle (Blob)
  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: "base64",
  });

  if (file.fileSize === 0)
    throw new Error("Failed to read image file, fileSize is 0.");

  // 2. Generate a unique file path. Adding a timestamp prevents caching issues.
  const fileExtension = file.uri.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${userId}/avatar.${fileExtension}?t=${new Date().getTime()}`;

  // 3. Upload the file blob to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, decode(base64), {
      cacheControl: "3600",
      upsert: true,
      contentType: file.mimeType || "image/jpeg",
    });

  if (uploadError) throw uploadError;

  // 4. Get the public URL for saving in the 'profiles' table
  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath.split("?")[0]);

  const publicUrl = urlData.publicUrl;
  if (!publicUrl) throw new Error("Could not get public URL for avatar.");

  // 5. Update the 'avatar_url' column in the user's 'profiles' table
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) {
    console.error(
      "[profileService] Profile avatar URL update error:",
      updateError
    );
    throw updateError;
  }

  return publicUrl;
};
