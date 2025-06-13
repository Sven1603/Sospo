// src/types/userTypes.ts

export type UserProfile = {
  id: string; // UUID, matches auth.users.id
  updated_at: string | null; // ISO timestamp
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};
