import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserState, UserTier, CREDIT_COSTS } from "../types";
import { LOADING_MESSAGES } from "../constants";
import { generateCaricature } from "../services/geminiService";
import FlameLoader from "./FlameLoader";

interface CaricatureStudioProps {
  userState: UserState;
  userId: string;
  onBurnComplete: (imageBase64: string, metadata: any) => void;
  onError: (msg: string) => void;
}

const CaricatureStudio: React.FC<CaricatureStudioProps> = ({
  userState,
  userId,
  onBurnComplete,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [remixMode, setRemixMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userState.credits < CREDIT_COSTS.image) {
      onError("OUT OF CREDITS");
      return;
    }

    setLoading(true);
    try {
      const resultBase64 = await generateCaricature(
        description,
        userId,
        remixMode,
      );
      const fullImageStr = `data:image/png;base64,${resultBase64}`;
      setCurrentImage(fullImageStr);
      setRemixMode(false);
      onBurnComplete(fullImageStr, { prompt: description });
    } catch (err: any) {
      onError(err?.message || "Failed to generate caricature.");
    } finally {
      setLoading(false);
      setDescription("");
    }
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
        <div className="bg-white/[0.03] border border-white/[0.06] p-6 rounded-2xl mt-6 flex flex-col items-center">
          <div className="w-full max-w-sm aspect-square skeleton-shimmer rounded-xl" />
          <div className="flex gap-3 mt-5 w-full max-w-sm">
            <div className="h-10 skeleton-shimmer rounded-xl flex-1" />
            <div className="h-10 skeleton-shimmer rounded-xl flex-1" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 sm:p-7">
        {/* Image display */}
        <AnimatePresence mode="wait">
          {currentImage ? (
            <motion.div
              key="image"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center mb-7"
            >
              <div className="relative w-full max-w-sm aspect-square rounded-xl overflow-hidden border border-white/[0.1] shadow-2xl">
                <img
                  src={currentImage}
                  alt="Generated Caricature"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex gap-3 mt-5">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = currentImage;
                    link.download = "burnbot-caricature.png";
                    link.click();
                  }}
                  className="px-5 py-2.5 bg-white/[0.06] border border-white/[0.08] text-gray-300 rounded-xl text-xs font-bold hover:bg-white/[0.1] transition-all"
                >
                  Download
                </motion.button>
                {userState.tier === UserTier.ELITE && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setRemixMode(true)}
                    className="px-5 py-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-500/20 transition-all"
                  >
                    Remix
                  </motion.button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 border border-dashed border-white/[0.08] rounded-xl mb-7"
            >
              <div className="text-3xl mb-2 opacity-20">🎨</div>
              <p className="text-gray-600 text-sm">
                No image generated yet. Describe your target below.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        {(remixMode || !currentImage) && (
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-gray-500 text-xs mb-2 font-medium uppercase tracking-wider">
                {remixMode ? "Remix Instruction" : "Physical Description"}
              </label>
              <textarea
                required
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-purple-500/50 focus:bg-white/[0.06] focus:outline-none transition-all h-28 resize-none"
                placeholder={
                  remixMode
                    ? "e.g. Make the ears bigger, add a clown hat..."
                    : "e.g. Big nose, curly hair, wearing a tuxedo, looking confused..."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3.5 bg-white text-black rounded-xl font-bold text-sm tracking-wide hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white transition-all"
            >
              {remixMode
                ? "Apply Remix"
                : `Generate Caricature (${CREDIT_COSTS.image} credits)`}
            </motion.button>
          </motion.form>
        )}
      </div>
    </motion.div>
  );
};

export default CaricatureStudio;
