import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserState, UserTier, CREDIT_COSTS } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  userState: UserState;
  onLogout: () => void;
  userEmail?: string;
}

const tierLabel: Record<UserTier, string> = {
  [UserTier.FREE]: "FREE",
  [UserTier.ELITE]: "ELITE",
};

const tierGradient: Record<UserTier, string> = {
  [UserTier.FREE]: "from-gray-600 to-gray-500",
  [UserTier.ELITE]: "from-orange-500 to-red-500",
};

const navItems = [
  { id: "roast", icon: "✏️", label: "Roasts", desc: "Write roasts" },
  { id: "caricature", icon: "🎨", label: "Pictures", desc: "AI pictures" },
  { id: "vault", icon: "🔒", label: "The Vault", desc: "Your history" },
];

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userState,
  onLogout,
  userEmail,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="text-sm font-bold text-white">BurnBot</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-gradient-to-r ${tierGradient[userState.tier]} text-white`}
          >
            {tierLabel[userState.tier]}
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 z-20 bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`w-64 h-screen bg-[#0A0A0A]/95 backdrop-blur-xl border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-30 transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5d00ff] to-[#8800ff] flex items-center justify-center shadow-lg shadow-orange-900/30">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">
                BurnBot
              </span>
              <span
                className={`ml-2 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-gradient-to-r ${tierGradient[userState.tier]} text-white`}
              >
                {tierLabel[userState.tier]}
              </span>
            </div>
          </div>
          {userEmail && (
            <p className="text-[11px] text-gray-200 font-mono mt-2 truncate">
              {userEmail}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 mt-2">
          {navItems.map((item, i) => {
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-100 group relative ${
                  isActive
                    ? "bg-white/[0.1] text-white"
                    : "text-gray-500 hover:bg-white/[0.06] hover:text-gray-300"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 top-1-translate-y-1/2 w-[4px] h-full rounded-r-full bg-gradient-to-b from-orange-500 to-red-500"
                    transition={{
                      type: "spring",
                      stiffness: 1000,
                      damping: 80,
                    }}
                  />
                )}
                <span className="text-xl">{item.icon}</span>
                <div className="text-left">
                  <span
                    className={`text-md font-medium block ${isActive ? "text-white" : "text-gray-100"}`}
                  >
                    {item.label}
                  </span>
                  <span className="text-[12px] text-gray-400 block leading-tight">
                    {item.desc}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </nav>

        {/* Credits Section */}
        <div className="px-4 pb-2">
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-mono text-gray-100 uppercase tracking-widest">
                Credits
              </span>
              {userState.tier === UserTier.ELITE && (
                <span className="text-[10px] text-orange-400 font-bold font-mono">
                  ∞ TEXT
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#b700ff] font-mono">
                {userState.credits}
              </span>
              <span className="text-sm text-gray-100">remaining</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 mb-2 space-y-2">
          <button
            onClick={() => {
              handleTabClick("pricing");
            }}
            className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-xs font-bold text-white hover:brightness-110 transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98]"
          >
            BUY CREDITS
          </button>

          <button
            onClick={onLogout}
            className="w-full py-3 text-[11px] font-mono text-gray-100 hover:text-gray-400 transition-colors rounded-lg hover:bg-white/[0.03]"
          >
            Sign Out
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
