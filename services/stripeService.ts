import { supabase } from "./supabaseClient";

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

// Helper to get auth token for API requests
const getAuthToken = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
};

/**
 * Create a Stripe Checkout session for a credit pack purchase.
 */
export const createCheckoutSession = async (
  packId: string,
): Promise<CheckoutResult> => {
  const token = await getAuthToken();
  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ pack: packId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create checkout session");
  }

  return response.json();
};

export const verifySession = async (
  sessionId: string,
): Promise<{ status: string; pack: string }> => {
  const token = await getAuthToken();
  const response = await fetch(`/api/verify-session/${sessionId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error("Failed to verify payment session");
  }

  return response.json();
};

export const redirectToCheckout = async (packId: string): Promise<void> => {
  const { url } = await createCheckoutSession(packId);
  window.location.href = url;
};
