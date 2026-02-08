import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserState, BurnHistoryItem } from "../types";

interface TheVaultProps {
  userState: UserState;
}

const filterOptions = ["all", "text", "image"] as const;

const TheVault: React.FC<TheVaultProps> = ({ userState }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "text" | "image">("all");

  const allHistory = userState.history;
  const filteredHistory = allHistory.filter(
    (item) => filter === "all" || item.type === filter,
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          {filterOptions.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                filter === f
                  ? "bg-white text-black"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-600 ml-auto">
          {allHistory.length} total
        </span>
      </div>

      {allHistory.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="text-4xl mb-3 opacity-20">📦</div>
          <p className="text-gray-600 text-sm">
            Nothing here yet. Generate your first roast or caricature.
          </p>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {filteredHistory.map((item, i) => {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className="bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl overflow-hidden transition-colors group"
                >
                  {item.type === "text" ? (
                    <div className="p-5 flex flex-col h-full">
                      <div className="flex justify-between text-[10px] text-gray-600 mb-3">
                        <span className="font-medium">
                          {item.metadata?.name || "—"}
                        </span>
                        <span>
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-grow max-h-40 overflow-y-auto pr-1">
                        {item.content}
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => copyToClipboard(item.content, item.id)}
                        className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                          copied === item.id
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-white/[0.04] border border-white/[0.06] text-gray-500 hover:bg-white/[0.08] hover:text-gray-300"
                        }`}
                      >
                        {copied === item.id ? "Copied!" : "Copy"}
                      </motion.button>
                    </div>
                  ) : (
                    <div className="relative aspect-square">
                      <img
                        src={item.content}
                        alt="Caricature"
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a
                          href={item.content}
                          download={`burnbot-${item.timestamp}.png`}
                          className="px-4 py-2.5 bg-white text-black font-bold rounded-xl text-xs hover:scale-105 transition-transform"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TheVault;
