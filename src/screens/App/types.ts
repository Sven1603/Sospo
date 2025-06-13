import { ProfileStub } from "../../types/commonTypes";

export type JoinRequest = {
  id: string;
  club_id: string;
  user_id: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null; // New field
  requester_profile: ProfileStub | null;
  reviewer_profile: ProfileStub | null;
};
