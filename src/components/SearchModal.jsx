import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Film,
  Sparkles,
  Download,
  Calendar,
  Palette,
  Upload,
  Video,
  X
} from "lucide-react";

export default function SearchModal({
  isOpen,
  onClose,
  projects,
  onOpenProject,
  onNavigateTab
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Search items: projects + actions
  const actionItems = [
    { id: "act-radar", title: "Live Creator & Streamer Radar", icon: Sparkles, category: "Live Feeds", tab: "radar" },
    { id: "act-upload", title: "Upload Local Video", icon: Upload, category: "Actions", tab: "home" },
    { id: "act-record", title: "Record Screen or Webcam", icon: Video, category: "Actions", tab: "home" },
    { id: "act-exported", title: "View Exported Clips", icon: Download, category: "Navigation", tab: "exported" },
    { id: "act-calendar", title: "Social Content Calendar", icon: Calendar, category: "Navigation", tab: "calendar" },
    { id: "act-brand", title: "Brand Kit & Subtitle Presets", icon: Palette, category: "Navigation", tab: "brand" }
  ];

  const projectItems = projects.map((p) => ({
    id: p.id,
    title: p.title,
    icon: Film,
    category: "Projects",
    project: p
  }));

  const allItems = [...projectItems, ...actionItems];

  const filteredItems = allItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        if (selected.project) {
          onOpenProject(selected.project);
        } else if (selected.tab) {
          onNavigateTab(selected.tab);
        }
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="studio-modal-backdrop" onClick={onClose}>
      <div
        className="search-modal-container"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="search-input-header">
          <Search size={18} color="var(--primary)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search projects..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              fontSize: 15,
              color: "var(--text-main)"
            }}
          />
          <button className="header-icon-btn" onClick={onClose} style={{ width: 28, height: 28 }}>
            <X size={16} />
          </button>
        </div>

        <div className="search-modal-results">
          {filteredItems.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No matching projects or actions found
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`search-result-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    if (item.project) {
                      onOpenProject(item.project);
                    } else if (item.tab) {
                      onNavigateTab(item.tab);
                    }
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon size={16} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
