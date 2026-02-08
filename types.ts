export enum UserTier {
  FREE = "FREE",
  ELITE = "ELITE",
}

export type RoastStyle = "Rap" | "Poetry" | "Passive-Aggressive" | "Normal";

export interface RoastRequest {
  name: string;
  relation: string;
  traits: string[];
  style: RoastStyle;
}

export interface BurnHistoryItem {
  id: string;
  type: "text" | "image";
  content: string; // Text content or Base64 Image string
  metadata?: {
    name: string;
    style: string;
    prompt?: string;
  };
  timestamp: number;
}

export const CREDIT_COSTS = {
  text: 10,
  image: 50,
};

export interface CreditPack {
  id: string;
  name: string;
  price: number; // cents
  priceLabel: string;
  credits: number;
  description: string;
  highlight?: boolean;
  isElite?: boolean;
  badge?: string;
}

export interface UserState {
  tier: UserTier;
  credits: number;
  history: BurnHistoryItem[];
}
