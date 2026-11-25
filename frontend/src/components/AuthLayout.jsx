import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Share2, CalendarClock, Sun, Moon } from "lucide-react";
import "../pages/auth.css";

const THEME_STORAGE_KEY = "ai_social_hub_auth_theme";

const FEATURES = [
  {
    title: "AI-Powered Content Generation",
    subtitle: "Craft high-impact LinkedIn & X posts tailored to your tone in seconds.",
    icon: Sparkles,
    gradient: "linear-gradient(135deg, #a855f7, #ec4899)",
  },
  {
    title: "Smart Social Media Management",
    subtitle: "Connect your accounts securely and publish across platforms seamlessly.",
    icon: Share2,
    gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)",
  },
  {
    title: "Automated Post Scheduling",
    subtitle: "Plan your content calendar ahead and stay consistent effortlessly.",
    icon: CalendarClock,
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  },
];

export default function AuthLayout({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="auth-shell" data-theme={theme}>
      {/* Unique AI-inspired background */}
      <div className="auth-bg-layer" aria-hidden="true">
        <div className="auth-aurora auth-aurora-1" />
        <div className="auth-aurora auth-aurora-2" />
        <div className="auth-aurora auth-aurora-3" />
        <div className="auth-neural-grid" />
      </div>

      {/* Theme Toggle (Login & Registration only) */}
      <button
        type="button"
        onClick={toggleTheme}
        className="auth-theme-toggle"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#4f46e5" />}
        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      </button>

      <div className="auth-grid">
        {/* Left Side: Branding + Feature Highlights */}
        <motion.div
          className="auth-left"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div className="auth-brand-row">
            <div className="auth-brand-badge">
              <svg width="30" height="30" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 44V26C20 22.6863 22.6863 20 26 20H38C41.3137 20 44 22.6863 44 26V44" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M20 32H44" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
                <circle cx="44" cy="20" r="6" fill="#00F2FE" />
              </svg>
            </div>
            <div>
              <div className="auth-brand-name">AI Social Hub</div>
              <div className="auth-brand-tag">Intelligent Social Growth Studio</div>
            </div>
          </div>

          <h1 className="auth-hero-title">
            Grow Your Professional{" "}
            <span className="auth-hero-gradient">Presence with AI</span>
          </h1>

          <p className="auth-hero-desc">
            Create, manage and schedule engaging social media content with the power of artificial intelligence.
          </p>

          <div className="auth-features">
            {FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  className="auth-feature-item"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.12 + idx * 0.1 }}
                >
                  <div className="auth-feature-icon" style={{ background: feat.gradient }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="auth-feature-title">{feat.title}</h3>
                    <p className="auth-feature-sub">{feat.subtitle}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Right Side: Auth Card */}
        <motion.div
          className="auth-right"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
        >
          <div className="auth-card">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
