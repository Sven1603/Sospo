// src/navigation/types.ts

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

// AppTabParamList remains the same (for the bottom tabs)
export type AppTabParamList = {
  Home: undefined;
  Clubs: undefined;
  Events: undefined;
};

export type MainAppStackParamList = {
  AppTabs: { screen?: keyof AppTabParamList };
  ManageClubClaims: undefined;
  Profile: undefined;
  CreateClub: undefined;
  ClubDetail: { clubId: string };
  ClaimClub: { clubId: string; clubName: string };
  EditClub: { clubId: string };
  ManageJoinRequests: { clubId: string; clubName: string };
  ManageClubMembers: { clubId: string; clubName: string };
  ClubSettings: { clubId: string; clubName: string };
  TransferAdminScreen: { clubId: string; clubName: string };
  RespondToAdminTransferScreen: {
    transferRequestId: string;
    clubName: string;
    currentAdminUsername: string | null; // Username of admin who initiated
    newRoleForCurrentAdmin: "member" | "contributor"; // What the initiating admin will become
  };
  ClubReviewsScreen: {
    clubId: string;
    clubName: string;
    averageRating?: number | null; // Optional, can be passed for display
    reviewCount?: number | null; // Optional
  };
  SubmitReviewScreen: {
    clubId: string;
    clubName: string;
    existingReview?: {
      rating: number;
      comment: string | null;
      reviewId: string;
    };
  };
  EventWizardScreen: {
    clubId?: string;
    clubName?: string;
    eventId?: string;
    eventName?: string;
  };
  EventDetailScreen: { eventId: string; eventName?: string };
  EventSettingsScreen: {
    eventId: string;
    eventName: string;
    clubId?: string | null;
    createdByUserId: string;
  };
  ManageEventJoinRequests: { eventId: string; eventName: string };
};

export type RootStackParamList = {
  Auth: undefined;
  MainAppStack: undefined;
  Loading: undefined;
};
