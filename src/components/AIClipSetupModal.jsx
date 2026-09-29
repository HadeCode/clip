import React, { useState } from "react";
import {
  Sparkles,
  Clock,
  Sliders,
  Type,
  Layout,
  X,
  ArrowRight,
  Flame,
  Music,
  Check,
  Search,
  MessageSquare,
  Wand2,
  Tag,
  Grid,
  Video
} from "lucide-react";

export default function AIClipSetupModal({
  isOpen,
  onClose,
  videoSource,
  videoTitle = "",
  videoThumbnail = "",
  onConfirmGenerate
}) {
  const [workflowMode, setWorkflowMode] = useState("clipanything"); // "clipbasic" | "clipanything"
  const [durationOption, setDurationOption] = useState("30-60"); // "15-30", "30-60", "15-60", "60-90", "auto"
  const [clipCount, setClipCount] = useState(6);
  const [aiFocus, setAiFocus] = useState("hooks"); // "hooks", "music", "quotes", "action"
  const [customPrompt, setCustomPrompt] = useState("");
  const [keywords, setKeywords] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [layoutMode, setLayoutMode] = useState("fill"); // "fill", "fit", "split"
  const [subtitleStyle, setSubtitleStyle] = useState("hormozi");

  if (!isOpen) return null;

  const quickPrompts = [
    "🔥 Find the most intense cliffhanger",
    "💡 Best actionable advice & secrets",
    "😂 Funniest moments & reactions",
    "⚡ High-energy beat drops & music peaks",
    "🐊 Shocking revelation & danger moments"
  ];

  const durationOptions = [
    {
      id: "15-30",
      label: "< 30s",
      sublabel: "Shorts & TikTok Hooks",
      desc: "Maximum retention for quick vertical scrolling."
    },
    {
      id: "30-60",
      label: "30s - 60s",
      sublabel: "Recommended",
      desc: "Complete story arc (Hook → Body → Punchline)."
    },
    {
      id: "15-60",
      label: "Auto (15-60s)",
      sublabel: "AI Sweet Spot",
      desc: "AI dynamically picks the exact optimal moment length."
    },
    {
      id: "60-90",
      label: "60s - 90s",
      sublabel: "Deep-Dive",
      desc: "For rich tutorials, debates, and webinars."
    }
  ];

  const focusOptions = [
    {
      id: "hooks",
      title: "🔥 Viral Hooks & Energy Peaks",
      desc: "Evaluates the first 3 seconds, decibel rises, and emotional climaxes."
    },
    {
      id: "action",
      title: "⚡ Dynamic Action & Stunts",
      desc: "Kinetic motion, high-stakes suspense, and thrilling adventures."
    },
    {
      id: "quotes",
      title: "💡 Best Quotes & Punchlines",
      desc: "Identifies counter-intuitive wisdom, takeaways, and golden nuggets."
    },
    {
      id: "music",
      title: "🎵 Music Drops & Chorus Retention",
      desc: "Cuts rhythmic beat drops and high retention audio segments."
    }
  ];

  const layoutOptions = [
    { id: "fill", label: "9:16 Auto Reframe", desc: "Speaker centered (Best for Shorts)" },
    { id: "fit", label: "9:16 Ambient Wings", desc: "No cropping, blurred backdrop" },
    { id: "split", label: "Split-Screen", desc: "Dual multi-speaker podcast layout" }
  ];

  const handleGenerate = () => {
    onConfirmGenerate({
      workflowMode: workflowMode,
      durationRange: durationOption,
      clipCount: clipCount,
      aiFocus: aiFocus,
      customPrompt: customPrompt,
      keywords: keywords,
      aspectRatio: aspectRatio,
      layoutMode: layoutMode,
      subtitleStyle: subtitleStyle
    });
    onClose();
  };

  return (
    <div className="studio-modal-backdrop" onClick={onClose}>
      <div
        className="export-progress-modal"
        style={{
          width: 720,
          maxWidth: "95vw",
          textAlign: "left",
          alignItems: "stretch",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 28
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: 14
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                boxShadow: "0 4px 14px rgba(139, 92, 246, 0.4)"
              }}
            >
              <Wand2 size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                  Opus Clip AI Workflow
                </h3>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    background: "#e0e7ff",
                    color: "#4338ca",
                    padding: "2px 6px",
                    borderRadius: 4,
                    letterSpacing: 0.5
                  }}
                >
                  ClipGenius™ 3.0
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "3px 0 0 0" }}>
                AI curation, ClipAnything™ prompts, and virality scoring for YouTube Shorts
              </p>
            </div>
          </div>

          <button className="header-icon-btn" onClick={onClose} style={{ width: 32, height: 32 }}>
            <X size={18} />
          </button>
        </div>

        {/* Video Card Preview */}
        {(videoTitle || videoThumbnail) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 14px",
              background: "var(--bg-surface-secondary)",
              borderRadius: "var(--radius-md)",
              marginTop: 14,
              border: "1px solid var(--border-color)"
            }}
          >
            {videoThumbnail && (
              <img
                src={videoThumbnail}
                alt=""
                style={{ width: 88, height: 50, borderRadius: 6, objectFit: "cover" }}
              />
            )}
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {videoTitle || "Selected Video"}
              </div>
              <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, marginTop: 2 }}>
                ✓ Multimodal video pipeline ready
              </div>
            </div>
          </div>
        )}

        {/* 1. Workflow Mode Toggle: ClipBasic vs ClipAnything */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", gap: 8, background: "var(--bg-surface-secondary)", padding: 4, borderRadius: 10, border: "1px solid var(--border-color)" }}>
            <button
              type="button"
              onClick={() => setWorkflowMode("clipanything")}
              style={{
                flex: 1,
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: workflowMode === "clipanything" ? "var(--bg-surface)" : "transparent",
                color: workflowMode === "clipanything" ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: 700,
                fontSize: 13,
                boxShadow: workflowMode === "clipanything" ? "var(--shadow-sm)" : "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <Sparkles size={15} />
              <span>ClipAnything™ (Prompt AI)</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkflowMode("clipbasic")}
              style={{
                flex: 1,
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: workflowMode === "clipbasic" ? "var(--bg-surface)" : "transparent",
                color: workflowMode === "clipbasic" ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: 700,
                fontSize: 13,
                boxShadow: workflowMode === "clipbasic" ? "var(--shadow-sm)" : "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <Flame size={15} />
              <span>ClipBasic (Auto Viral Curation)</span>
            </button>
          </div>
        </div>

        {/* ClipAnything Prompt Box */}
        {workflowMode === "clipanything" && (
          <div style={{ marginTop: 14, background: "rgba(99, 102, 241, 0.05)", padding: 14, borderRadius: 10, border: "1px solid rgba(99, 102, 241, 0.2)" }}>
            <label className="setting-label" style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 6px 0", color: "#4f46e5" }}>
              <MessageSquare size={14} />
              Describe what you want the AI to extract:
            </label>
            <input
              type="text"
              placeholder="e.g. Find the most shocking revelation, or scenes discussing business rules..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                background: "var(--bg-surface)",
                color: "var(--text-main)",
                fontSize: 13,
                fontWeight: 600,
                outline: "none"
              }}
            />

            {/* Quick Prompt Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomPrompt(qp.replace(/^[^\w\s]+\s*/, ""))}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    padding: "4px 10px",
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Keywords / Topic Filter Input (Opus Clip Topic Filtering) */}
        <div style={{ marginTop: 14 }}>
          <label className="setting-label" style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 6px 0" }}>
            <Tag size={14} color="var(--primary)" />
            Filter by Keywords / Topic (Optional)
          </label>
          <div style={{ position: "relative" }}>
            <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="e.g. stunt, danger, money, success, rule, mistake..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px 9px 36px",
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                background: "var(--bg-surface)",
                color: "var(--text-main)",
                fontSize: 13,
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* 2. Preferred Clip Length (Opus Clip Durations) */}
        <div style={{ marginTop: 18 }}>
          <label className="setting-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Clock size={15} color="var(--primary)" />
            Preferred Clip Length (YouTube Shorts / TikTok)
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {durationOptions.map((opt) => (
              <div
                key={opt.id}
                onClick={() => setDurationOption(opt.id)}
                style={{
                  padding: "10px 10px",
                  borderRadius: "var(--radius-md)",
                  border: `2px solid ${durationOption === opt.id ? "var(--primary)" : "var(--border-color)"}`,
                  background: durationOption === opt.id ? "var(--primary-light)" : "var(--bg-surface)",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: durationOption === opt.id ? "var(--primary)" : "var(--text-main)" }}>
                    {opt.label}
                  </span>
                  {durationOption === opt.id && <Check size={15} color="var(--primary)" />}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
                  {opt.sublabel}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.25 }}>
                  {opt.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. ReframeAnything™ Layout Mode */}
        <div style={{ marginTop: 18 }}>
          <label className="setting-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Layout size={15} color="var(--accent-cyan)" />
            Auto Reframe & Layout Mode
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {layoutOptions.map((lo) => (
              <div
                key={lo.id}
                onClick={() => setLayoutMode(lo.id)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${layoutMode === lo.id ? "var(--primary)" : "var(--border-color)"}`,
                  background: layoutMode === lo.id ? "var(--primary-light)" : "var(--bg-surface)",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: layoutMode === lo.id ? "var(--primary)" : "var(--text-main)" }}>
                    {lo.label}
                  </span>
                  {layoutMode === lo.id && <Check size={14} color="var(--primary)" />}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                  {lo.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Clip Count & Caption Style */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
          <div>
            <label className="setting-label">Clips to Extract</label>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {[3, 4, 6, 8, 10, 15].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`preset-card-btn ${clipCount === num ? "active" : ""}`}
                  style={{ flex: 1, padding: "8px 2px", fontSize: 12 }}
                  onClick={() => setClipCount(num)}
                >
                  {num} Clips
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="setting-label">Caption Style Preset</label>
            <select
              value={subtitleStyle}
              onChange={(e) => setSubtitleStyle(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                background: "var(--bg-surface-secondary)",
                color: "var(--text-main)",
                marginTop: 6,
                fontSize: 13,
                fontWeight: 600
              }}
            >
              <option value="hormozi">Hormozi Pop (Yellow Karaoke Highlight)</option>
              <option value="bold">Modern Bold (Cyan Pop)</option>
              <option value="neon">Neon Cyber (Pink/Cyan)</option>
              <option value="clean">Clean Minimal</option>
            </select>
          </div>
        </div>

        {/* Bottom Generate Button with Opus Branding */}
        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            className="get-clips-btn"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "14px 20px",
              fontSize: 15,
              background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #3b82f6 100%)",
              boxShadow: "0 4px 18px rgba(99, 102, 241, 0.4)"
            }}
            onClick={handleGenerate}
          >
            <Wand2 size={18} />
            <span>
              Generate {clipCount} Viral Clips with Opus AI ({durationOption}s)
            </span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
