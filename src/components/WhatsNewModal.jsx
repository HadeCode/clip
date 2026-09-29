import React from "react";
import { Bell, Sparkles, X, CheckCircle2 } from "lucide-react";

export default function WhatsNewModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const updates = [
    {
      version: "v4.0",
      date: "September 2026",
      title: "Live Creator & Streamer Radar (Twitch + YouTube)",
      description: "Real-time popularity tracking for English streamers and creators with 1-click YouTube Shorts clipping and authentic speech transcription."
    },
    {
      version: "v3.8",
      date: "September 2026",
      title: "Real-Time Word-Level Subtitle Karaoke",
      description: "Subtitles now animate word-by-word with instant speaker synchronization and customizable Hormozi, Neon, and Bold styles."
    },
    {
      version: "v3.6",
      date: "August 2026",
      title: "In-Browser 9:16 Video Canvas Exporter",
      description: "Zero wait times! Clips export directly inside your browser with hardware-accelerated MediaRecorder."
    }
  ];

  return (
    <div className="studio-modal-backdrop" onClick={onClose}>
      <div
        className="export-progress-modal"
        style={{ width: 540, textAlign: "left", alignItems: "stretch" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={20} color="var(--primary)" />
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>What's New in Vizard</h3>
          </div>
          <button className="header-icon-btn" onClick={onClose} style={{ width: 30, height: 30 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
          {updates.map((u) => (
            <div
              key={u.version}
              style={{
                background: "var(--bg-surface-secondary)",
                borderRadius: "var(--radius-md)",
                padding: 14
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>
                  {u.version} • {u.date}
                </span>
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{u.title}</h4>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {u.description}
              </p>
            </div>
          ))}
        </div>

        <button
          className="get-clips-btn"
          style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
