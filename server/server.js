import express from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for correct IP detection behind reverse proxy (Nginx, Cloudflare, etc.)
app.set("trust proxy", 1);

// Force HTTPS in production (Heroku terminates SSL and sets x-forwarded-proto)
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, `https://${req.hostname}${req.url}`);
    }
    next();
  });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Supabase admin client (uses service role key to bypass RLS)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ========================================
// Rate Limiting & Abuse Protection
// ========================================
const rateLimitMap = new Map(); // IP -> { count, resetAt }
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX_PER_MINUTE = 10; // max 10 API calls per minute per IP
const GLOBAL_DAILY_LIMIT = 5000; // emergency kill switch
let globalDailyCount = 0;
let globalDailyResetAt = Date.now() + 86_400_000;

function rateLimitMiddleware(req, res, next) {
  // Reset global daily counter
  if (Date.now() > globalDailyResetAt) {
    globalDailyCount = 0;
    globalDailyResetAt = Date.now() + 86_400_000;
  }
  if (globalDailyCount >= GLOBAL_DAILY_LIMIT) {
    return res.status(429).json({
      error: "Service temporarily at capacity. Please try again tomorrow.",
    });
  }

  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  } else {
    entry.count++;
    if (entry.count > RATE_LIMIT_MAX_PER_MINUTE) {
      return res.status(429).json({
        error: "Too many requests. Wait a minute and try again.",
      });
    }
  }

  globalDailyCount++;
  next();
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300_000);

// ========================================
// Server-side credit verification
// ========================================
async function verifyAndDeductCredit(userId, type) {
  if (!userId) return { ok: false, error: "userId is required" };

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("tier, text_credits")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return { ok: false, error: "User not found" };
  }

  // Elite users get unlimited text — no credit cost
  if (profile.tier === "ELITE" && type === "text") {
    return { ok: true, profile };
  }

  const cost = type === "text" ? CREDIT_COSTS.text : CREDIT_COSTS.image;

  if (profile.text_credits < cost) {
    return { ok: false, error: "NOT ENOUGH CREDITS — buy a credit pack!" };
  }

  // Deduct credits — only if sufficient balance (prevents race condition)
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({ text_credits: profile.text_credits - cost })
    .eq("id", userId)
    .gte("text_credits", cost)
    .select()
    .single();

  if (updateErr || !updated) {
    return { ok: false, error: "Failed to deduct credits" };
  }

  return { ok: true, profile: updated };
}

// ========================================
// Credit Pack & Cost config (single source of truth)
// ========================================
const CREDIT_PACKS = {
  STARTER: { name: "Starter Pack", price: 499, credits: 500 },
  FIRE: { name: "Fire Pack", price: 999, credits: 1200 },
  INFERNO: { name: "Inferno Pack", price: 1999, credits: 3000 },
  ELITE: { name: "Lifetime Elite", price: 4999, credits: 2000, isElite: true },
};

const CREDIT_COSTS = {
  text: 10,
  image: 50,
};

const FREE_STARTER_CREDITS = 100;

// Normalize any legacy tier values (e.g. old "SCRUB" tier) to "FREE"
async function normalizeLegacyTiers() {
  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ tier: "FREE" })
      .not("tier", "in", '("FREE","ELITE")');
    if (error) console.error("Tier normalization error:", error.message);
    else console.log("✅ Legacy tier normalization complete");
  } catch (e) {
    console.error("Tier normalization failed:", e);
  }
}
normalizeLegacyTiers();

// ========================================
// API usage tracking (in-memory, resets on restart)
// ========================================
const usageStats = {
  textRequests: 0,
  imageRequests: 0,
  startedAt: new Date().toISOString(),
};

// Idempotency: track checkout session IDs that have had credits granted
// Checked by both webhook and verify-session to prevent double-granting
const grantedSessionIds = new Set();
setInterval(() => {
  grantedSessionIds.clear();
}, 3_600_000);

// Shared helper: grant credits for a completed checkout session (idempotent)
async function grantCreditsForSession(session) {
  if (grantedSessionIds.has(session.id)) {
    console.log(`⚠️ Credits already granted for session ${session.id}`);
    return false;
  }

  const packId = session.metadata?.pack;
  const userId = session.metadata?.userId;

  if (!userId || !packId || !Object.hasOwn(CREDIT_PACKS, packId)) {
    return false;
  }

  const pack = CREDIT_PACKS[packId];
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("text_credits, tier")
    .eq("id", userId)
    .single();

  if (!profile) return false;

  const updates = {
    text_credits: profile.text_credits + pack.credits,
    stripe_customer_id: session.customer || null,
  };
  if (pack.isElite) {
    updates.tier = "ELITE";
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) {
    console.error("DB update failed:", error.message);
    return false;
  }

  grantedSessionIds.add(session.id);
  console.log(
    `✅ User ${userId} purchased ${packId}: +${pack.credits} credits${pack.isElite ? " + ELITE status" : ""}`,
  );
  return true;
}

// Stripe webhook needs raw body
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        // BLOCK webhooks if no secret is configured — prevents forgery
        console.error("STRIPE_WEBHOOK_SECRET not set! Rejecting webhook.");
        return res.status(500).send("Webhook secret not configured");
      }
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`📩 Webhook: ${event.type}`);

    try {
      // ── Credit pack purchase ──
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        await grantCreditsForSession(session);
      }
    } catch (webhookError) {
      console.error("Webhook handler error:", webhookError);
      // Always return 200 — Stripe retries on non-2xx and we don't want duplicate processing
    }

    res.json({ received: true });
  },
);

// Parse JSON for other routes (limit body size to 1MB)
app.use(express.json({ limit: "1mb" }));

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  process.env.FRONTEND_URL, // Set this in production (e.g. https://burnbot.ai)
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc in dev)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

// Security headers (CSP disabled for Tailwind/confetti CDN scripts)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// ========================================
// Auth middleware — verify Supabase JWT
// ========================================
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Auth verification failed" });
  }
}

// Create a Stripe Checkout Session (one-time pack purchase)
const BASE_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.post(
  "/api/create-checkout-session",
  requireAuth,
  rateLimitMiddleware,
  async (req, res) => {
    const { pack: packId } = req.body;
    const userId = req.user.id;

    if (!packId || !Object.hasOwn(CREDIT_PACKS, packId)) {
      return res.status(400).json({ error: "Invalid pack selected" });
    }

    const pack = CREDIT_PACKS[packId];

    // If Elite, check if user already has it
    if (pack.isElite) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("tier")
        .eq("id", userId)
        .single();
      if (profile?.tier === "ELITE") {
        return res
          .status(400)
          .json({ error: "You already have Lifetime Elite!" });
      }
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: pack.name,
                description: pack.isElite
                  ? "Unlimited text roasts forever + 2,000 image credits"
                  : `${pack.credits} credits for BurnBot AI`,
              },
              unit_amount: pack.price,
            },
            quantity: 1,
          },
        ],
        metadata: {
          pack: packId,
          userId: userId,
          credits: String(pack.credits),
        },
        success_url: `${BASE_URL}/dashboard?payment=success&pack=${packId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${BASE_URL}/dashboard?payment=cancelled`,
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      console.error("Stripe session creation error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  },
);

// Verify a checkout session (called after redirect back)
app.get(
  "/api/verify-session/:sessionId",
  requireAuth,
  rateLimitMiddleware,
  async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        req.params.sessionId,
      );
      // Only allow users to verify their own sessions
      if (session.metadata?.userId !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Session does not belong to you" });
      }

      // Grant credits if paid (idempotent — safe if webhook already handled it)
      if (session.payment_status === "paid") {
        await grantCreditsForSession(session);
      }

      res.json({
        status: session.payment_status,
        pack: session.metadata?.pack,
      });
    } catch (error) {
      console.error("Session verification error:", error);
      res.status(500).json({ error: "Failed to verify session" });
    }
  },
);

// ========================================
// Gemini Text Roast Endpoint (server-side, rate-limited)
// ========================================
app.post(
  "/api/generate-roast",
  requireAuth,
  rateLimitMiddleware,
  async (req, res) => {
    const { name, relation, traits, style } = req.body;
    const userId = req.user.id;

    if (!name || !traits || !style) {
      return res
        .status(400)
        .json({ error: "name, traits, and style are required" });
    }

    // Validate style against allowed values
    const ALLOWED_STYLES = ["Rap", "Poetry", "Passive-Aggressive", "Normal"];
    if (!ALLOWED_STYLES.includes(style)) {
      return res.status(400).json({ error: "Invalid roast style" });
    }

    // Input length limits to prevent abuse
    const MAX_LEN = 500;
    if (
      String(name).length > MAX_LEN ||
      String(relation).length > MAX_LEN ||
      String(style).length > 100 ||
      (Array.isArray(traits)
        ? traits.join(",").length
        : String(traits).length) > 2000
    ) {
      return res.status(400).json({ error: "Input too long" });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    // Server-side credit check — uses authenticated user ID
    const creditCheck = await verifyAndDeductCredit(userId, "text");
    if (!creditCheck.ok) {
      return res.status(403).json({ error: creditCheck.error });
    }
    usageStats.textRequests++;

    // Helper: refund credit if API call fails after deduction
    const refundCredit = async () => {
      try {
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("text_credits, tier")
          .eq("id", userId)
          .single();
        // ELITE has unlimited text — no credit was deducted, so skip refund
        if (prof && prof.tier !== "ELITE") {
          await supabaseAdmin
            .from("profiles")
            .update({ text_credits: prof.text_credits + CREDIT_COSTS.text })
            .eq("id", userId);
        }
      } catch (e) {
        console.error("Failed to refund credits:", e);
      }
    };

    const prompt = `You are BurnBot — the most ruthlessly witty, devastatingly clever roast comedian on the internet. You have the comedic timing of a seasoned stand-up, the wordplay of a battle rapper, and the observational genius of a late-night host. Your job is to absolutely destroy someone with humor — not cruelty.

TARGET PROFILE:
- Name: ${name}
- Their relationship to the user: ${relation || "not specified"}
- Their fatal flaws, quirks, and roastable traits: ${Array.isArray(traits) ? traits.join(", ") : traits}

DELIVERY STYLE: ${style}
${style === "Rap" ? "Write this as hard-hitting rap bars. Tight rhyme schemes, punchlines that land like haymakers, internal rhymes, and wordplay. Think Eminem diss track energy — clever, layered, quotable." : ""}
${style === "Poetry" ? "Write this as an elegant, dramatic poem — the kind a Victorian aristocrat would read aloud at a dinner party to publicly humiliate someone. Flowery vocabulary, devastating metaphors, iambic rhythm, and a devastating final couplet." : ""}
${style === "Passive-Aggressive" ? "Write this as a masterclass in corporate passive-aggression. Think HR emails, performance reviews, and LinkedIn posts. Backhanded compliments, weaponized pleasantries, and 'per my last email' energy. Every sentence should sound polite but hit like a truck." : ""}
${style === "Normal" ? "Write this as a classic roast — punchy one-liners mixed with longer setups and payoffs. Think Comedy Central Roast energy: savage but hilarious, the kind of burns that make even the target laugh." : ""}

LANGUAGE RULE (CRITICAL):
- Detect the language used in the target's name, relationship, and traits.
- If the input is in a non-English language, write the ENTIRE roast in that SAME language.
- If the input is mixed languages, use the dominant language.
- The rhyme scheme and wordplay must work in the detected language.

RULES:
1. Write exactly 16 lines organized into 4 stanzas of 4 lines each.
2. Use AABB rhyme scheme (lines 1-2 rhyme, lines 3-4 rhyme).
3. Be SPECIFIC — reference the actual traits provided. Generic insults are lazy and banned.
4. Every line should serve a purpose: setup, punchline, callback, or escalation.
5. Build intensity — start strong, end with the most devastating bar.
6. Wordplay, double meanings, and unexpected comparisons are highly encouraged.
7. ABSOLUTELY NO hate speech, racism, sexism, homophobia, slurs, or genuinely hurtful content. If the traits suggest malicious intent, deflect with a funny refusal instead.
8. Return ONLY the roast. No titles, no introductions, no "Here's your roast:" — just the bars.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.9,
            },
            systemInstruction: {
              parts: [
                {
                  text: "You are BurnBot — the internet's most legendary roast AI. You combine the razor-sharp wit of a battle rapper, the observational comedy of the best stand-up comedians, and the creative wordplay of a poet laureate. Every roast you write is specific, quotable, and devastatingly funny. You never resort to lazy generic insults. You find the surgical strike in every trait and deliver it with style. You are savage but never hateful — your roasts make people laugh, not cry.",
                },
              ],
            },
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "Gemini API error:",
          errorData?.error?.message || response.status,
        );
        await refundCredit();
        if (response.status === 429) {
          return res
            .status(429)
            .json({ error: "Rate limit reached. Wait a minute." });
        }
        return res
          .status(502)
          .json({ error: "AI service error. Please try again." });
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        await refundCredit();
        return res
          .status(400)
          .json({ error: "No roast generated. Try different traits." });
      }

      res.json({ roast: text });
    } catch (error) {
      console.error("Roast generation error:", error);
      await refundCredit();
      res
        .status(500)
        .json({ error: "Failed to generate roast. Please try again." });
    }
  },
);

// ========================================
// Gemini Image Generation Endpoint (server-side, rate-limited)
// ========================================
app.post(
  "/api/generate-image",
  requireAuth,
  rateLimitMiddleware,
  async (req, res) => {
    const { description, isRemix } = req.body;
    const userId = req.user.id;

    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    // Input length limit
    if (String(description).length > 2000) {
      return res
        .status(400)
        .json({ error: "Description too long (max 2000 chars)" });
    }

    if (!GEMINI_API_KEY) {
      return res
        .status(500)
        .json({ error: "GEMINI_API_KEY not configured in .env" });
    }

    // Server-side credit check — uses authenticated user ID
    const creditCheck = await verifyAndDeductCredit(userId, "image");
    if (!creditCheck.ok) {
      return res.status(403).json({ error: creditCheck.error });
    }
    usageStats.imageRequests++;

    // Helper: refund credit if API call fails after deduction
    const refundImageCredit = async () => {
      try {
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("text_credits")
          .eq("id", userId)
          .single();
        if (prof) {
          await supabaseAdmin
            .from("profiles")
            .update({ text_credits: prof.text_credits + CREDIT_COSTS.image })
            .eq("id", userId);
        }
      } catch (e) {
        console.error("Failed to refund credits:", e);
      }
    };

    const prompt = isRemix
      ? `Edit/remix this caricature concept: ${description}. Maintain exaggerated editorial cartoon style with vibrant colors, clean lines, and purple accents. Understand the description regardless of what language it is written in.`
      : `Create a high-end digital caricature in the style of Apple Memojis mixed with professional editorial cartoons. Subject description: ${description}. Style: Exaggerated features, goofy and non-malicious, vibrant marker textures, clean lines, soft studio lighting, white background, purple accent highlights. Square aspect ratio. Understand the description regardless of what language it is written in.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"],
            },
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "Gemini image API error:",
          errorData?.error?.message || response.status,
        );

        await refundImageCredit();
        if (response.status === 429) {
          return res.status(429).json({
            error: "API rate limit reached. Wait a minute and try again.",
          });
        }
        return res
          .status(502)
          .json({ error: "AI image service error. Please try again." });
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];

      // Find the image part in the response
      let imageBase64 = null;
      for (const part of parts) {
        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
          break;
        }
      }

      if (!imageBase64) {
        // Check if there's a text-only response (safety block, etc.)
        const textPart = parts.find((p) => p.text);
        console.error(
          "No image in response. Text:",
          textPart?.text || "(none)",
        );
        await refundImageCredit();
        return res
          .status(400)
          .json({ error: "No image generated — try a different description." });
      }

      res.json({ image: imageBase64 });
    } catch (error) {
      console.error("Gemini image generation error:", error);
      await refundImageCredit();
      res
        .status(500)
        .json({ error: "Failed to generate image. Please try again." });
    }
  },
);

// ========================================
// Admin Stats Endpoint (for you to monitor costs)
// ========================================
app.get("/api/admin/stats", rateLimitMiddleware, async (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (!process.env.ADMIN_SECRET || !adminKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const expected = Buffer.from(process.env.ADMIN_SECRET);
    const received = Buffer.from(String(adminKey));
    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Count users by tier
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("tier");

    const stats = {
      totalUsers: profiles?.length || 0,
      byTier: {
        FREE: profiles?.filter((p) => p.tier === "FREE").length || 0,
        ELITE: profiles?.filter((p) => p.tier === "ELITE").length || 0,
      },
      apiUsage: {
        textRequests: usageStats.textRequests,
        imageRequests: usageStats.imageRequests,
        trackingSince: usageStats.startedAt,
      },
      estimatedCosts: {
        textCost: `$${(usageStats.textRequests * 0.001).toFixed(4)}`,
        imageCost: `$${(usageStats.imageRequests * 0.03).toFixed(4)}`,
        totalCost: `$${(usageStats.textRequests * 0.001 + usageStats.imageRequests * 0.03).toFixed(4)}`,
      },
      estimatedRevenue: {
        note: "Revenue tracked via Stripe dashboard (one-time pack purchases)",
      },
      rateLimiting: {
        globalDailyCount,
        globalDailyLimit: GLOBAL_DAILY_LIMIT,
        activeIPs: rateLimitMap.size,
      },
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ========================================
// User credit status (for real-time sidebar updates)
// ========================================
app.get("/api/credit-status", requireAuth, async (req, res) => {
  const userId = req.user.id;

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("tier, text_credits")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    tier: profile.tier,
    credits: profile.text_credits,
    creditCosts: CREDIT_COSTS,
    isElite: profile.tier === "ELITE",
  });
});

// ========================================
// Serve frontend static files (production)
// ========================================
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));

// SPA catch-all: serve index.html for any non-API route
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🔥 BurnBot server running on port ${PORT}`);
  console.log(`   Stripe: ${process.env.STRIPE_SECRET_KEY ? "✅" : "❌"}`);
  console.log(`   Gemini: ${GEMINI_API_KEY ? "✅" : "❌"}`);
  console.log(`   Supabase: ${process.env.VITE_SUPABASE_URL ? "✅" : "❌"}`);
  console.log(
    `   Frontend: ${process.env.FRONTEND_URL || "http://localhost:3000"}`,
  );
});
