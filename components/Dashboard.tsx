import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { UserTier, BurnHistoryItem, UserState, CREDIT_COSTS } from "../types";
import { CREDIT_PACKS } from "../constants";
import {
  getProfile,
  profileToUserState,
  addToHistoryDB,
  getHistoryDB,
  UserProfile,
} from "../services/databaseService";
import { verifySession } from "../services/stripeService";
import { supabase } from "../services/supabaseClient";
import DissEngine from "./DissEngine";
import CaricatureStudio from "./CaricatureStudio";
import TheVault from "./TheVault";
import Sidebar from "./Sidebar";

declare global {
  interface Window {
    confetti: any;
  }
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: "easeOut" },
};

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<BurnHistoryItem[]>([]);
  const [userState, setUserState] = useState<UserState>({
    tier: UserTier.FREE,
    credits: 100,
    history: [],
  });
  const [activeTab, setActiveTab] = useState<
    "roast" | "caricature" | "vault" | "pricing"
  >("roast");
  const [showUpsell, setShowUpsell] = useState(false);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [dataLoading, setDataLoading] = useState(true);

  useLayoutEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  const loadData = useCallback(async () => {
    const [prof, hist] = await Promise.all([
      getProfile(user.id),
      getHistoryDB(user.id),
    ]);
    if (prof) {
      setProfile(prof);
      setHistory(hist);
      setUserState(profileToUserState(prof, hist));
    }
    setDataLoading(false);
  }, [user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Stripe redirect
  useEffect(() => {
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    const packId = searchParams.get("pack");

    if (payment === "success" && sessionId) {
      verifySession(sessionId)
        .then(async (result) => {
          if (result.status === "paid") {
            // verify-session already granted credits server-side
            // Just reload the profile
            await loadData();
            if (window.confetti) {
              window.confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 },
                colors: ["#FF4500", "#7C3AED", "#FFFFFF", "#FFD700"],
              });
            }
            const packName =
              CREDIT_PACKS.find((p) => p.id === packId)?.name || "Pack";
            showToast(
              "success",
              `${packName} purchased! Your credits are ready.`,
            );
          }
        })
        .catch(() =>
          showToast("error", "Could not verify payment. Contact support."),
        )
        .finally(() => setSearchParams({}));
    } else if (payment === "cancelled") {
      showToast("error", "Payment cancelled. No charges were made.");
      setSearchParams({});
    }
  }, []);

  const showToast = (type: "error" | "success", msg: string) => {
    if (type === "error") {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const handleBurnComplete = async (content: string, metadata: any) => {
    if (!profile) return;
    const type = activeTab === "caricature" ? "image" : "text";

    // Credits are already deducted server-side in /api/generate-roast and /api/generate-image.
    // Just save to history and re-fetch the updated profile from DB.
    const historyItem = await addToHistoryDB(user.id, {
      type,
      content,
      metadata,
      timestamp: Date.now(),
    });

    // Re-fetch fresh profile (server already deducted credits)
    const freshProfile = await getProfile(user.id);
    if (freshProfile) {
      setProfile(freshProfile);
      const newHistory = historyItem ? [historyItem, ...history] : history;
      setHistory(newHistory);
      setUserState(profileToUserState(freshProfile, newHistory));
    }
  };

  const handleError = (msg: string) => {
    if (msg.includes("CREDITS") || msg.includes("OUT OF")) {
      setShowUpsell(true);
    } else {
      showToast("error", msg);
    }
  };

  const handleBuyPack = (packId: string) => {
    setShowConfirm(packId);
  };

  const handleConfirmPayment = async (packId: string) => {
    setCheckoutLoading(true);
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pack: packId }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "No checkout URL");
      }
    } catch {
      showToast(
        "error",
        "Failed to start checkout. Is the payment server running?",
      );
      setCheckoutLoading(false);
      setShowConfirm(null);
    }
  };

  useEffect(() => {
    if (activeTab === "pricing") {
      setShowUpsell(true);
    }
  }, [activeTab]);

  const tabHeaders: Record<string, { title: string; subtitle: string }> = {
    roast: {
      title: "Burn Station",
      subtitle: "Write devastating roasts with AI.",
    },
    caricature: {
      title: "Picture Lab",
      subtitle: "Generate hilarious AI pictures.",
    },
    vault: {
      title: "The Vault",
      subtitle: "Your complete history of roasts.",
    },
  };

  const header = tabHeaders[activeTab] || tabHeaders.roast;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex">
      <Sidebar
        activeTab={activeTab === "pricing" ? "roast" : activeTab}
        setActiveTab={setActiveTab}
        userState={userState}
        onLogout={onLogout}
        userEmail={user.email}
      />

      <main className="flex-1 lg:ml-64 relative overflow-hidden pt-16 lg:pt-0">
        {/* Ambient glow */}
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="fixed bottom-0 left-0 lg:left-64 w-[400px] h-[400px] bg-orange-900/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Toasts */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed top-6 right-6 z-50 bg-red-500/10 backdrop-blur-xl border border-red-500/30 text-red-300 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 max-w-md"
            >
              <span className="text-red-400">✕</span>
              <span className="text-sm">{errorMsg}</span>
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed top-6 right-6 z-50 bg-green-500/10 backdrop-blur-xl border border-green-500/30 text-green-300 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 max-w-md"
            >
              <span className="text-green-400">✓</span>
              <span className="text-sm">{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-5 sm:p-8 lg:p-10 max-w-5xl mx-auto">
          {dataLoading ? (
            <div className="flex items-center justify-center h-64">
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-gray-500 font-mono text-sm"
              >
                Loading your data...
              </motion.div>
            </div>
          ) : (
            <>
              {/* Header */}
              <motion.header
                key={activeTab}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-10"
              >
                <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
                  {header.title}
                </h1>
                <p className="text-gray-500 text-sm">{header.subtitle}</p>
              </motion.header>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} {...pageTransition}>
                  {activeTab === "roast" && (
                    <DissEngine
                      userState={userState}
                      userId={user.id}
                      onBurnComplete={handleBurnComplete}
                      onError={handleError}
                    />
                  )}
                  {activeTab === "caricature" && (
                    <CaricatureStudio
                      userState={userState}
                      userId={user.id}
                      onBurnComplete={handleBurnComplete}
                      onError={handleError}
                    />
                  )}
                  {activeTab === "vault" && <TheVault userState={userState} />}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </main>

      {/* Credit Packs / Upsell Modal */}
      <AnimatePresence>
        {showUpsell && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl max-w-4xl w-full p-5 sm:p-8 relative overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => {
                  setShowUpsell(false);
                  if (activeTab === "pricing") setActiveTab("roast");
                }}
                className="absolute top-5 right-5 text-gray-600 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06]"
              >
                ✕
              </button>

              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold mb-2">Get More Credits</h2>
                <p className="text-gray-500 text-sm">
                  Buy a credit pack to keep burning. Text roasts cost{" "}
                  {CREDIT_COSTS.text} credits, images cost {CREDIT_COSTS.image}{" "}
                  credits.
                </p>
                {userState.tier === UserTier.ELITE && (
                  <p className="text-purple-400 text-xs font-bold mt-2">
                    ✦ ELITE — Unlimited text roasts active
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CREDIT_PACKS.map((pack, i) => {
                  const isEliteOwned =
                    pack.isElite && userState.tier === UserTier.ELITE;
                  return (
                    <motion.div
                      key={pack.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                        pack.highlight
                          ? "border-purple-500/40 bg-purple-500/5"
                          : pack.isElite
                            ? "border-orange-500/30 bg-orange-500/5"
                            : "border-white/[0.06] bg-white/[0.02]"
                      } hover:border-white/20`}
                    >
                      {pack.badge && (
                        <div
                          className={`absolute -top-3 left-1/2 -translate-x-1/2 ${pack.isElite ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-purple-600"} text-white text-[10px] font-bold px-3 py-1 rounded-full`}
                        >
                          {pack.badge}
                        </div>
                      )}
                      <h3 className="text-lg font-bold text-white mb-1 mt-1">
                        {pack.name}
                      </h3>
                      <div className="text-2xl font-bold mb-2">
                        <span className="text-white">{pack.priceLabel}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">
                        {pack.isElite ? (
                          <>
                            <span className="text-orange-400 font-bold">
                              ∞ text roasts
                            </span>{" "}
                            + {pack.credits} image credits
                          </>
                        ) : (
                          <>
                            <span className="text-purple-400 font-bold">
                              {pack.credits}
                            </span>{" "}
                            credits — {pack.description}
                          </>
                        )}
                      </p>
                      {isEliteOwned ? (
                        <div className="w-full py-3 rounded-xl font-bold text-sm text-center bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          ✦ ACTIVE
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBuyPack(pack.id)}
                          className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-white text-black hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-500 hover:text-white active:scale-[0.98]"
                        >
                          {pack.isElite ? "UNLOCK FOREVER" : "BUY PACK"}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0A0A0A] border border-purple-500/20 rounded-2xl max-w-md w-full p-8 relative"
            >
              <button
                onClick={() => {
                  setShowConfirm(null);
                  setCheckoutLoading(false);
                }}
                className="absolute top-4 right-4 text-gray-600 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06]"
                disabled={checkoutLoading}
              >
                ✕
              </button>

              {(() => {
                const pack = CREDIT_PACKS.find((p) => p.id === showConfirm);
                if (!pack) return null;
                return (
                  <>
                    <div className="text-center mb-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.1 }}
                        className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
                      >
                        {pack.isElite ? "👑" : "🔥"}
                      </motion.div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {pack.name}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        {pack.isElite
                          ? "Unlimited text + bonus image credits."
                          : `${pack.credits} credits to burn.`}
                      </p>
                    </div>

                    <div className="bg-white/[0.03] rounded-xl p-5 mb-6 border border-white/[0.06]">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-500 text-xs font-mono">
                          PACK
                        </span>
                        <span className="text-white font-bold text-sm">
                          {pack.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-500 text-xs font-mono">
                          PRICE
                        </span>
                        <span className="text-white font-bold text-lg">
                          {pack.priceLabel}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs font-mono">
                          CREDITS
                        </span>
                        <span className="text-purple-400 font-bold text-lg">
                          +{pack.credits}
                        </span>
                      </div>
                      {pack.isElite && (
                        <div className="border-t border-white/[0.06] mt-3 pt-3">
                          <p className="text-xs text-orange-400 font-bold">
                            + Unlimited text roasts forever
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleConfirmPayment(showConfirm)}
                      disabled={checkoutLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-sm tracking-wide hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-2 active:scale-[0.98]"
                    >
                      {checkoutLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg
                            className="animate-spin h-4 w-4"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Redirecting to Stripe...
                        </span>
                      ) : (
                        `Pay ${pack.priceLabel}`
                      )}
                    </button>

                    <p className="text-center text-[10px] text-gray-600 font-mono">
                      Secure one-time payment via Stripe. No subscription.
                    </p>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
