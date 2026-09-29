import React from "react";
import { BookOpen, Play, X, ExternalLink } from "lucide-react";

export default function TutorialsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const tutorials = [
    {
      title: "Repurposing Long Podcasts into Viral 9:16 Shorts",
      duration: "3:45",
      views: "42K",
      thumbnail: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80"
    },
    {
      title: "How to Style Hormozi Captions with Word-by-Word Karaoke",
      duration: "2:10",
      views: "68K",
      thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80"
    },
    {
      title: "Automate Cross-Posting to TikTok, Shorts, and Instagram",
      duration: "4:15",
      views: "29K",
      thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80"
    }
  ];

  return (
    <div className="studio-modal-backdrop" onClick={onClose}>
      <div
        className="export-progress-modal"
        style={{ width: 600, textAlign: "left", alignItems: "stretch" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen size={20} color="var(--primary)" />
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Vizard Video Tutorials</h3>
          </div>
          <button className="header-icon-btn" onClick={onClose} style={{ width: 30, height: 30 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          {tutorials.map((t, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                gap: 14,
                background: "var(--bg-surface-secondary)",
                borderRadius: "var(--radius-md)",
                padding: 10,
                alignItems: "center",
                cursor: "pointer"
              }}
              onClick={() => alert(`Starting tutorial: "${t.title}"`)}
            >
              <div
                style={{
                  width: 110,
                  height: 65,
                  borderRadius: 6,
                  overflow: "hidden",
                  position: "relative",
                  background: "#000",
                  flexShrink: 0
                }}
              >
                <img src={t.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.3)"
                  }}
                >
                  <Play size={18} color="white" fill="white" />
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginBottom: 4 }}>
                  {t.title}
                </h4>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {t.duration} • {t.views} views
                </span>
              </div>

              <ExternalLink size={16} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
