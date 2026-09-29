import React, { useState, useEffect } from "react";
import {
  Search,
  Gift,
  MessageSquare,
  Bell,
  Moon,
  Sun,
  User,
  Check,
  RotateCcw,
  Sparkles
} from "lucide-react";

export default function Header({ onOpenSearch, onOpenUpgrade, onResetData }) {
  const [theme, setTheme] = useState("light");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("vizard_theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("vizard_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <header className="vizard-header">
      {/* Global Search Bar (Cmd + K) */}
      <div className="header-search-container">
        <div className="header-search-bar" onClick={onOpenSearch}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search projects, clips..."
            readOnly
          />
          <div className="search-shortcut-badge">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Header Right Actions */}
      <div className="header-right-actions">
        {/* Pro Plan Active Unlimited Access */}
        <div
          className="credit-badge pro-unlimited-badge"
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.2) 100%)",
            borderColor: "rgba(16, 185, 129, 0.4)",
            cursor: "default"
          }}
          title="PRO Plan Active - All Features Unlocked & Zero Watermarks"
        >
          <Sparkles size={15} color="#10b981" />
          <span style={{ color: "var(--text-main)", fontWeight: 700 }}>PRO • Unlimited Access</span>
        </div>

        {/* Discord Community Button */}
        <button
          className="header-icon-btn"
          title="Join Discord Community"
          onClick={() => window.open("https://discord.gg/vizard", "_blank")}
        >
          <MessageSquare size={18} />
        </button>

        {/* Theme Toggle (Dark / Light) */}
        <button
          className="header-icon-btn"
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
          onClick={toggleTheme}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} color="#ffd166" />}
        </button>

        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <button
            className="header-icon-btn"
            title="Notifications"
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          >
            <Bell size={18} />
            <span className="header-notification-indicator" />
          </button>

          {isNotificationOpen && (
            <div
              className="workspace-dropdown-menu"
              style={{ width: 280, right: 0, left: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "8px 10px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid var(--border-color)" }}>
                Notifications
              </div>
              <div className="dropdown-item">
                <Sparkles size={14} color="var(--primary)" />
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>Real-Time Stream Radar Active</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Live 15s sync</div>
                </div>
              </div>
              <div className="dropdown-item">
                <Check size={14} color="var(--accent-green)" />
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>Opus Viral AI Engine Connected</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Ready for YouTube Shorts</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <div style={{ position: "relative" }}>
          <div
            className="user-profile-btn"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="user-avatar-circle">N</div>
          </div>

          {isProfileOpen && (
            <div
              className="workspace-dropdown-menu"
              style={{ width: 220, right: 0, left: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "10px", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Nirbhik</div>
                <div style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
                  Pro Creator Plan
                </div>
              </div>

              <div className="dropdown-item" onClick={toggleTheme}>
                {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
                <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
              </div>

              <div
                className="dropdown-item"
                style={{ color: "#ef4444" }}
                onClick={() => {
                  if (confirm("Clear all workspace projects and reset cache?")) {
                    onResetData();
                    setIsProfileOpen(false);
                  }
                }}
              >
                <RotateCcw size={15} />
                <span>Reset Workspace Cache</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
