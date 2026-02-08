import { RoastRequest } from "../types";
import { supabase } from "./supabaseClient";

/**
 * Get the current user's auth token for server requests.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Generate a roast via the server-side API endpoint.
 * The API key never leaves the server. Rate limiting & credit checks
 * are enforced server-side.
 */
export const generateRoast = async (
  request: RoastRequest,
  _userId?: string,
): Promise<string> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/generate-roast", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: request.name,
        relation: request.relation,
        traits: request.traits,
        style: request.style,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err.error || `Roast generation failed (${response.status})`,
      );
    }

    const data = await response.json();
    return (
      data.roast || "The AI refused to roast this target. Try being less evil."
    );
  } catch (error: any) {
    console.error("Roast Generation Error:", error);
    const msg = error?.message || "";
    if (msg.includes("OUT OF CREDITS")) {
      throw new Error("OUT OF CREDITS");
    }
    if (
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("Too many")
    ) {
      throw new Error("Too many requests. Wait a minute and try again.");
    }
    throw new Error(msg || "Failed to generate roast.");
  }
};

/**
 * Generate a caricature via the server-side API endpoint.
 * Rate limiting & credit checks enforced server-side.
 */
export const generateCaricature = async (
  description: string,
  _userId?: string,
  isRemix: boolean = false,
): Promise<string> => {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/generate-image", {
    method: "POST",
    headers,
    body: JSON.stringify({ description, isRemix }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err.error || `Image generation failed (${response.status})`,
    );
  }

  const data = await response.json();
  return data.image;
};
