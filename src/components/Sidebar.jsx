import React, { useState, useEffect } from "react";
import {
  Home,
  Film,
  Download,
  Calendar,
  BarChart2,
  Palette,
  Users,
  Bell,
  BookOpen,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Check,
  Plus,
  Settings,
  Radio
} from "lucide-react";
import { AGENT_ROTATING_PROMPTS } from "../utils/constants";

export default function Sidebar({
  activeTab,
  setActiveTab,
  exportedCount = 0,
  onOpenAgent,
  onOpenWhatsNew,
  onOpenTutorials
}) {
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState("My Workspace");
  const [promptIndex, setPromptIndex] = useState(0);

  // Rotating prompt cycling animation in the Vizard Agent entry
  useEffect(() => {
    const timer = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % AGENT_ROTATING_PROMPTS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "radar", label: "Live Radar", icon: Radio, isLive: true },
    { id: "projects", label: "Projects", icon: Film },
    { id: "exported", label: "Exported", icon: Download, badge: exportedCount },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "brand", label: "Brand kit", icon: Palette },
    { id: "shared", label: "Shared with me", icon: Users }
  ];

  return (
    <aside className="vizard-sidebar">
      {/* Logo */}
      <div className="sidebar-logo-area">
        <div className="sidebar-logo">
          <svg className="logo-icon-svg" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#6C5CE7" />
            <path d="M8 10L16 24L24 10H19.5L16 17.5L12.5 10H8Z" fill="white" />
            <circle cx="23" cy="9" r="3" fill="#FF5E7E" />
          </svg>
          <span className="logo-text">
            vizard<span>.ai</span>
          </span>
        </div>
      </div>

      {/* Workspace Selector */}
      <div
        className="sidebar-workspace-selector"
        onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
      >
        <div className="workspace-info">
          <div className="workspace-avatar">
            {currentWorkspace.charAt(0).toUpperCase()}
          </div>
          <span className="workspace-name">{currentWorkspace}</span>
        </div>
        {isWorkspaceMenuOpen ? (
          <ChevronDown size={16} color="var(--text-muted)" />
        ) : (
          <ChevronRight size={16} color="var(--text-muted)" />
        )}

        {/* Dropdown Menu */}
        {isWorkspaceMenuOpen && (
          <div
            className="workspace-dropdown-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="dropdown-item"
              onClick={() => {
                setCurrentWorkspace("My Workspace");
                setIsWorkspaceMenuOpen(false);
              }}
            >
              <Check size={14} color="var(--primary)" />
              <span>My Workspace (Personal)</span>
            </div>
            <div
              className="dropdown-item"
              onClick={() => {
                setCurrentWorkspace("Creator Studio Team");
                setIsWorkspaceMenuOpen(false);
              }}
            >
              <div style={{ width: 14 }} />
              <span>Creator Studio Team</span>
            </div>
            <div
              className="dropdown-item"
              style={{ borderTop: "1px solid var(--border-color)", marginTop: 4, paddingTop: 6 }}
              onClick={() => {
                alert("Invite teammates: Share your workspace link!");
                setIsWorkspaceMenuOpen(false);
              }}
            >
              <Plus size={14} />
              <span>Create new workspace</span>
            </div>
            <div
              className="dropdown-item"
              onClick={() => {
                setActiveTab("brand");
                setIsWorkspaceMenuOpen(false);
              }}
            >
              <Settings size={14} />
              <span>Workspace settings</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} color={item.isLive ? "#ff0055" : undefined} />
              <span>{item.label}</span>
              {item.isLive && (
                <span
                  className="live-pill-dot"
                  style={{
                    marginLeft: "auto",
                    background: "#ff0055",
                    boxShadow: "0 0 8px #ff0055",
                    width: 7,
                    height: 7
                  }}
                />
              )}
              {Boolean(item.badge && item.badge > 0) && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Bottom Actions */}
      <div className="sidebar-bottom">
        <div
          className="sidebar-bottom-item"
          onClick={onOpenWhatsNew}
          title="See latest updates & changelog"
        >
          <Bell size={16} />
          <span>What's new</span>
          <span className="dot-badge" />
        </div>

        <div
          className="sidebar-bottom-item"
          onClick={onOpenTutorials}
          title="Watch tutorials & user guide"
        >
          <BookOpen size={16} />
          <span>Tutorials</span>
        </div>

        {/* Vizard Agent Beta Entry Card */}
        <div className="agent-card-entry" onClick={onOpenAgent}>
          <div className="agent-card-header">
            <div className="agent-card-title">
              <Sparkles size={14} color="#ff0080" />
              <span>Vizard Agent</span>
            </div>
            <span className="beta-tag">BETA</span>
          </div>

          <p className="agent-card-prompt">
            {AGENT_ROTATING_PROMPTS[promptIndex]}
          </p>

          <div className="agent-card-cta">
            <span>Try Vizard Agent</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </aside>
  );
}
