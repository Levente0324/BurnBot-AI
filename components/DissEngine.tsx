import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoastRequest, UserState, UserTier, CREDIT_COSTS } from "../types";
import { STYLES, LOADING_MESSAGES } from "../constants";
import { generateRoast } from "../services/geminiService";
import FlameLoader from "./FlameLoader";

interface DissEngineProps {
  userState: UserState;
  userId: string;
  onBurnComplete: (text: string, metadata: any) => void;
  onError: (msg: string) => void;
}

const inputClass =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-purple-500/50 focus:bg-white/[0.06] focus:outline-none transition-all duration-200";

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const DissEngine: React.FC<DissEngineProps> = ({
  userState,
  userId,
  onBurnComplete,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<RoastRequest>({
    name: "",
    relation: "",
    traits: [""],
    style: STYLES[0],
  });

  const handleTraitChange = (index: number, value: string) => {
    const newTraits = [...form.traits];
    newTraits[index] = value;
    setForm({ ...form, traits: newTraits });
  };

  const addTrait = () => {
    if (form.traits.length < 5) {
      setForm({ ...form, traits: [...form.traits, ""] });
    }
  };

  const removeTrait = (index: number) => {
    if (form.traits.length > 1) {
      const newTraits = form.traits.filter((_, i) => i !== index);
      setForm({ ...form, traits: newTraits });
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      userState.credits < CREDIT_COSTS.text &&
      userState.tier !== UserTier.ELITE
    ) {
      onError("OUT OF CREDITS");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const roastText = await generateRoast(form, userId);
      setResult(roastText);
      onBurnComplete(roastText, { name: form.name, style: form.style });
    } catch (err: any) {
      onError(err?.message || "Failed to generate roast.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewRoast = () => {
    setResult(null);
    setCopied(false);
    setForm({ name: "", relation: "", traits: [""], style: STYLES[0] });
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-2xl mx-auto"
      >
        <FlameLoader
          message={
            LOADING_MESSAGES[
              Math.floor(Math.random() * LOADING_MESSAGES.length)
            ]
          }
        />
        <div className="bg-white/[0.03] border border-white/[0.06] p-6 rounded-2xl mt-6 space-y-3">
          {[75, 100, 85, 65, 0, 80, 100, 75, 85, 0, 100, 65, 80, 75].map(
            (w, i) =>
              w === 0 ? (
                <div key={i} className="h-2" />
              ) : (
                <div
                  key={i}
                  className="h-3.5 skeleton-shimmer rounded-lg"
                  style={{ width: `${w}%` }}
                />
              ),
          )}
        </div>
      </motion.div>
    );
  }

  // Result view
  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-2xl mx-auto"
      >
        <div className="bg-white/[0.03] border border-white/[0.06] p-7 rounded-2xl">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {form.name}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {form.style} &middot; {new Date().toLocaleDateString()}
              </p>
            </div>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="px-2.5 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full border border-green-500/20"
            >
              DELIVERED
            </motion.span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-black/30 rounded-xl p-5 border border-white/[0.05] mb-5"
          >
            <p className="text-gray-300 whitespace-pre-line leading-relaxed text-sm">
              {result}
            </p>
          </motion.div>

          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCopy}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                copied
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-white/[0.06] border border-white/[0.08] text-gray-300 hover:bg-white/[0.1]"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNewRoast}
              className="flex-1 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-gradient-to-r hover:from-orange-500 hover:to-red-500 hover:text-white transition-all"
            >
              New Roast
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      className="w-full max-w-2xl mx-auto"
    >
      <motion.div
        variants={fadeUp}
        className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 sm:p-7"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={fadeUp}>
              <label className="block text-gray-500 text-xs mb-2 font-medium uppercase tracking-wider">
                Target Name
              </label>
              <input
                required
                type="text"
                className={inputClass}
                placeholder="e.g. Chad"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <label className="block text-gray-500 text-xs mb-2 font-medium uppercase tracking-wider">
                Relationship
              </label>
              <input
                required
                type="text"
                className={inputClass}
                placeholder="e.g. Ex-Boyfriend, Boss"
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
              />
            </motion.div>
          </div>

          <motion.div variants={fadeUp}>
            <label className="block text-gray-500 text-xs mb-2 font-medium uppercase tracking-wider">
              Flaws
            </label>
            <div className="space-y-2.5">
              <AnimatePresence>
                {form.traits.map((trait, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex gap-2"
                  >
                    <input
                      required
                      type="text"
                      className={inputClass}
                      placeholder={`Flaw #${idx + 1}  —  e.g. 'Cheats at Monopoly'`}
                      value={trait}
                      onChange={(e) => handleTraitChange(idx, e.target.value)}
                    />
                    {form.traits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTrait(idx)}
                        className="w-10 flex-shrink-0 rounded-xl border border-white/[0.08] text-gray-600 hover:text-red-400 hover:border-red-500/30 transition-all text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {form.traits.length < 5 && (
              <button
                type="button"
                onClick={addTrait}
                className="mt-2.5 text-xs text-purple-400 hover:text-white font-medium transition-colors"
              >
                + Add flaw ({form.traits.length}/5)
              </button>
            )}
          </motion.div>

          <motion.div variants={fadeUp}>
            <label className="block text-gray-500 text-xs mb-2.5 font-medium uppercase tracking-wider">
              Roast Style
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {STYLES.map((style) => (
                <motion.button
                  key={style}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setForm({ ...form, style })}
                  className={`py-4 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                    form.style === style
                      ? "bg-[#6f0ec4] text-white shadow-lg"
                      : "bg-white/[0.05] text-gray-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-gray-300"
                  }`}
                >
                  {style.toUpperCase()}
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.button
            variants={fadeUp}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-3.5 bg-white text-black rounded-xl font-bold text-sm tracking-wide hover:bg-gradient-to-r hover:from-[#6f0ec4] hover:via-[#8c15a3] hover:to-[#6f0ec4] hover:text-white transition-all active:scale-[0.98]"
          >
            Generate Roast{" "}
            <span className="ml-1">
              (
              {userState.tier === UserTier.ELITE
                ? "∞"
                : `${CREDIT_COSTS.text} credits`}
              )
            </span>
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default DissEngine;
