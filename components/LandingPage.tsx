import React, { useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CREDIT_PACKS } from "../constants";
import { CREDIT_COSTS } from "../types";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Force Dark Mode for this specific Cyberpunk Landing Page
  useLayoutEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      // Intentionally left blank to maintain dark mode transition
    };
  }, []);

  const handleStartBurning = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-neon-purple selection:text-white overflow-x-hidden relative">
      {/* Background Ambience (Subtle Glows) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-orange-900/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/90 backdrop-blur-sm border-b border-white/5 px-16 py-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-purple-800 rounded flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(124,58,237,0.5)]">
            <span className="mb-0.5">B</span>
          </div>
          <span className="font-bold text-xl tracking-tighter text-white uppercase">
            BurnBot
          </span>
        </div>
        <Link
          to="/login"
          className="px-6 py-2 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white text-[11px] font-bold uppercase tracking-widest rounded hover:brightness-110 transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)]"
        >
          Login / Sign Up
        </Link>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 pt-48 pb-24 px-6 text-center max-w-7xl mx-auto flex flex-col items-center">
        {/* Badge */}
        <div className="mb-10 inline-block animate-fade-in-up">
          <span className="px-5 py-2 rounded-full border border-[#DD00FF]/30 bg-[#7C3AED]/10 text-[#DD00FF] text-[10px] font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(124,58,237,0.1)]">
            ● AI-Powered Cruelty
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] mb-8 tracking-tight uppercase font-sans">
          <span className="block text-white mb-2">Get Roasted By</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] via-[#DD00FF] to-[#7A00B5] animate-pulse-slow">
            Artificial Intelligence
          </span>
        </h1>

        {/* Subhead */}
        <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
          Generate brutally funny roasts and twisted pictures of your friends
          (or enemies).
          <span className="text-gray-300 block mt-2 text-sm font-mono">
            Warning: Emotional damage may occur.
          </span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
          <button
            onClick={handleStartBurning}
            className="px-10 py-4 bg-[#6D46BD] hover:bg-[#7C3AED] text-white font-bold uppercase tracking-widest text-sm rounded-sm shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto"
          >
            Start Roasting
          </button>
          <button
            onClick={() => navigate("/login")}
            className="px-10 py-4 bg-[#6D46BD] hover:bg-[#7C3AED] text-white font-bold uppercase tracking-widest text-sm rounded-sm shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Features Grid */}
      <section className="relative z-10 py-24 px-6 bg-[#080808]/50 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            title="Savage Text Roasts"
            desc="Choose a persona and watch the AI dismantle someone's self-esteem with surgical precision."
            icon="✏️"
            iconColor="text-purple-400"
            bgColor="bg-purple-900/10"
            borderColor="border-purple-500/20"
          />
          <FeatureCard
            title="AI Pictures"
            desc="Turn a description into a hilarious visual masterpiece. Like a boardwalk artist on steroids."
            icon="🎨"
            iconColor="text-blue-400"
            bgColor="bg-blue-900/10"
            borderColor="border-blue-500/20"
          />
          <FeatureCard
            title="The Vault"
            desc="Save your best burns forever. Build a collection of cruelty to revisit whenever you need a laugh."
            icon="🔒"
            iconColor="text-gray-400"
            bgColor="bg-gray-800/20"
            borderColor="border-gray-700/30"
          />
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-widest mb-2">
              Buy more <span className="text-[#7C3AED]">Credits</span>
            </h2>
            <p className="text-gray-100 text-sm mt-4 font-mono">
              Text roasts = {CREDIT_COSTS.text} credits &middot; Images ={" "}
              {CREDIT_COSTS.image} credits &middot; No monthly subscriptions,
              Buy what you need.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CREDIT_PACKS.map((pack, i) => (
              <div
                key={pack.id}
                className={`bg-[#0A0A0A] border ${pack.highlight ? "border-[#7C3AED] scale-105 z-10 shadow-[0_0_30px_rgba(124,58,237,0.1)]" : pack.isElite ? "border-orange-500/30 hover:border-orange-500/60" : "border-gray-800 hover:border-gray-600"} p-8 flex flex-col transition-colors duration-300 relative`}
              >
                {pack.badge && (
                  <div
                    className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${pack.isElite ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-[#7C3AED]"} text-white text-[9px] font-bold px-3 py-1 uppercase tracking-wider`}
                  >
                    {pack.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold uppercase tracking-wider text-white">
                    {pack.name}
                  </h3>
                  <p className="text-[#DD00FF] text-[10px] font-bold uppercase tracking-widest mt-1">
                    {pack.isElite ? "One-Time Purchase" : "Credit Pack"}
                  </p>
                </div>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-white">
                    {pack.priceLabel}
                  </span>
                </div>
                <div className="mb-8">
                  {pack.isElite ? (
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-xs text-gray-100 font-mono">
                        <span className="text-orange-400">✓</span> Unlimited
                        Text Roasts Forever
                      </li>
                      <li className="flex items-center gap-3 text-xs text-gray-100 font-mono">
                        <span className="text-orange-400">✓</span>{" "}
                        {pack.credits} Image Credits
                      </li>
                      <li className="flex items-center gap-3 text-xs text-gray-100 font-mono">
                        <span className="text-orange-400">✓</span> Image
                        Remixing
                      </li>
                    </ul>
                  ) : (
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-xs text-gray-100 font-mono">
                        <span className="text-[#DD00FF]">✓</span> {pack.credits}{" "}
                        Credits
                      </li>
                      <li className="flex items-center gap-3 text-xs text-gray-100 font-mono">
                        <span className="text-[#DD00FF]">✓</span>{" "}
                        {pack.description}
                      </li>
                      <li className="flex items-center gap-3 text-xs text-gray-100 font-mono">
                        <span className="text-[#DD00FF]">✓</span> One-Time
                        Purchase
                      </li>
                    </ul>
                  )}
                </div>
                <div className="mt-auto">
                  <button
                    onClick={handleStartBurning}
                    className={`w-full py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                      pack.highlight
                        ? "bg-[#6D46BD] hover:bg-[#7C3AED] text-white shadow-lg shadow-purple-900/40"
                        : pack.isElite
                          ? "border border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                          : "border border-[#7C3AED]/40 text-[#7C3AED] hover:bg-[#7C3AED]/20"
                    }`}
                  >
                    {pack.isElite ? "GO ELITE" : "GET STARTED"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Free credits callout */}
          <div className="text-center mt-12">
            <p className="text-gray-200 text-xs font-mono">
              New users get{" "}
              <span className="text-[#7C3AED] font-bold">100 free credits</span>{" "}
              to try BurnBot. No credit card required.
            </p>
          </div>
        </div>
      </section>

      <footer className="py-4 text-center text-gray-700 text-[10px] border-t border-white/5 font-mono uppercase tracking-widest">
        <p>
          &copy; 2026 BurnBot AI. No feelings were spared in the making of this
          site.
        </p>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{
  title: string;
  desc: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}> = ({ title, desc, icon, iconColor, bgColor, borderColor }) => (
  <div
    className={`group p-8 bg-[#0A0A0A] border ${borderColor} hover:border-opacity-100 border-opacity-40 transition-all duration-300 hover:bg-[#0F0F0F]`}
  >
    <div
      className={`w-10 h-10 mb-6 flex items-center justify-center rounded-sm ${bgColor} ${iconColor} border border-opacity-20 group-hover:scale-110 transition-transform`}
    >
      <span className="text-lg">{icon}</span>
    </div>
    <h3 className="text-sm font-bold mb-3 uppercase tracking-widest text-white group-hover:text-[#7C3AED] transition-colors">
      {title}
    </h3>
    <p className="text-gray-300 text-xs leading-relaxed font-mono">{desc}</p>
  </div>
);

export default LandingPage;
