import { supabase } from "./supabaseClient";
import { UserTier, BurnHistoryItem, UserState } from "../types";

// --------------------------------------------------------
// Profile / Credits
// --------------------------------------------------------

export interface UserProfile {
  id: string;
  email: string;
  tier: UserTier;
  text_credits: number;
  stripe_customer_id: string | null;
}

/**
 * Fetch the current user's profile from Supabase.
 */
export const getProfile = async (
  userId: string,
): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, tier, text_credits, stripe_customer_id")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Failed to fetch profile:", error.message);
    return null;
  }

  return data as UserProfile;
};

/**
 * Convert a Supabase profile to the local UserState shape
 * (used by existing components).
 */
export const profileToUserState = (
  profile: UserProfile,
  history: BurnHistoryItem[] = [],
): UserState => ({
  tier: profile.tier as UserTier,
  credits: profile.text_credits, // single credit pool (text_credits column holds universal balance)
  history,
});

// NOTE: deductCreditDB and upgradeTierDB have been REMOVED.
// Credit deduction and tier upgrades are handled exclusively server-side
// (server.js verifyAndDeductCredit + Stripe webhook checkout.session.completed).
// Allowing these operations client-side was a critical security vulnerability.

// --------------------------------------------------------
// Burn History
// --------------------------------------------------------

/**
 * Add a burn to the history table.
 */
export const addToHistoryDB = async (
  userId: string,
  item: Omit<BurnHistoryItem, "id">,
): Promise<BurnHistoryItem | null> => {
  const { data, error } = await supabase
    .from("burn_history")
    .insert({
      user_id: userId,
      type: item.type,
      content: item.content,
      metadata: item.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to save to history:", error.message);
    return null;
  }

  // Map DB row → BurnHistoryItem
  return {
    id: data.id,
    type: data.type,
    content: data.content,
    metadata: data.metadata,
    timestamp: new Date(data.created_at).getTime(),
  };
};

/**
 * Fetch the user's burn history ordered newest-first.
 */
export const getHistoryDB = async (
  userId: string,
): Promise<BurnHistoryItem[]> => {
  const { data, error } = await supabase
    .from("burn_history")
    .select("id, user_id, type, content, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch history:", error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    type: row.type,
    content: row.content,
    metadata: row.metadata,
    timestamp: new Date(row.created_at).getTime(),
  }));
};
