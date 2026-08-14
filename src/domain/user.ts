export interface SubscriptionPlan {
  id?: number | string;
  name?: string;
}

export interface Subscription {
  plan?: SubscriptionPlan;
  planId?: number | string;
  planName?: string;
  status?: string;
}

export interface User {
  id: number | string;
  name: string;
  email?: string;
  avatar?: string;
  donator?: boolean;
  subscription?: Subscription;
}

export interface DeviceVerificationRequired {
  verificationRequired: true;
  challengeId: string;
  maskedEmail: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface LoginSuccess extends User {
  token: string;
  deviceToken?: string;
  data?: User;
}

export interface WatchLaterEntry {
  id: number;
  tmdbid: number;
  title?: string;
  subtitle?: string;
}

export interface WatchedProgress {
  tmdbID: number;
  mediaType: "movie" | "tv";
  completed?: boolean;
  episode?: number;
  season?: number;
  progress: number;
}

export type WatchHistoryEntry =
  | {
      id: string;
      name: string;
      type: "movie";
      tmdbID: string;
      createdAt: string;
    }
  | {
      id: string;
      name: string;
      type: "tv";
      tmdbID: string;
      season?: number;
      episode?: number;
      createdAt: string;
    };

export interface WatchHistoryResponse {
  count: number;
  result: WatchHistoryEntry[];
}
