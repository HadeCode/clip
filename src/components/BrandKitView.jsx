import React, { useState } from "react";
import {
  Palette,
  Upload,
  Check,
  RotateCcw,
  Sparkles,
  Type,
  Sliders,
  Image as ImageIcon
} from "lucide-react";
import { SUBTITLE_PRESETS } from "../utils/constants";

export default function BrandKitView({ brandKit, onUpdateBrandKit }) {
  const [localKit, setLocalKit] = useState(brandKit);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalKit((prev) => ({
        ...prev,
        logo: {
          ...prev.logo,
          url: url,
          name: file.name
        }
      }));
    }
  };

  const handleSave = () => {
    onUpdateBrandKit(localKit);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="view-scroll-container">
      {/* Header */}
      <div className="section-header-row" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-main)" }}>
            Brand Kit
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Customize your brand colors, watermark logo, and default subtitles style across all clips
          </p>
        </div>

        <button className="get-clips-btn" onClick={handleSave}>
          <Check size={16} />
          <span>{savedSuccess ? "Saved!" : "Save Brand Kit"}</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 32 }}>
        {/* Left Column: Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Brand Colors */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-color)",
              padding: 24
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Palette size={18} color="var(--primary)" />
              Brand Colors
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
              <div>
                <label className="setting-label">Primary Color</label>
                <div className="color-picker-row" style={{ marginTop: 8 }}>
                  <input
                    type="color"
                    className="color-circle-input"
                    value={localKit.colors?.primary || "#6c5ce7"}
                    onChange={(e) =>
                      setLocalKit({
                        ...localKit,
                        colors: { ...localKit.colors, primary: e.target.value }
                      })
                    }
                  />
                  <span style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>
                    {localKit.colors?.primary}
                  </span>
                </div>
              </div>

              <div>
                <label className="setting-label">Secondary / Pink</label>
                <div className="color-picker-row" style={{ marginTop: 8 }}>
                  <input
                    type="color"
                    className="color-circle-input"
                    value={localKit.colors?.secondary || "#ff5e7e"}
                    onChange={(e) =>
                      setLocalKit({
                        ...localKit,
                        colors: { ...localKit.colors, secondary: e.target.value }
                      })
                    }
                  />
                  <span style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>
                    {localKit.colors?.secondary}
                  </span>
                </div>
              </div>

              <div>
                <label className="setting-label">Accent / Gold</label>
                <div className="color-picker-row" style={{ marginTop: 8 }}>
                  <input
                    type="color"
                    className="color-circle-input"
                    value={localKit.colors?.accent || "#ffd166"}
                    onChange={(e) =>
                      setLocalKit({
                        ...localKit,
                        colors: { ...localKit.colors, accent: e.target.value }
                      })
                    }
                  />
                  <span style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>
                    {localKit.colors?.accent}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Logo & Watermark */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-color)",
              padding: 24
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <ImageIcon size={18} color="var(--primary)" />
              Brand Logo & Watermark
            </h3>

            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "var(--radius-md)",
                  border: "2px dashed var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  background: "var(--bg-surface-secondary)"
                }}
              >
                {localKit.logo?.url ? (
                  <img
                    src={localKit.logo.url}
                    alt="Logo"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <ImageIcon size={24} color="var(--text-muted)" />
                )}
              </div>

              <div>
                <label className="action-pill-btn" style={{ cursor: "pointer", display: "inline-flex" }}>
                  <Upload size={14} color="var(--primary)" />
                  <span>Upload Logo (PNG, SVG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display: "none" }}
                  />
                </label>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  Transparent PNG or SVG recommended
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="setting-label">Position</label>
                <select
                  value={localKit.logo?.position || "top-right"}
                  onChange={(e) =>
                    setLocalKit({
                      ...localKit,
                      logo: { ...localKit.logo, position: e.target.value }
                    })
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 6,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-surface-secondary)",
                    marginTop: 6
                  }}
                >
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <label className="setting-label">Opacity</label>
                  <span style={{ fontSize: 12 }}>
                    {Math.round((localKit.logo?.opacity || 0.85) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={localKit.logo?.opacity || 0.85}
                  onChange={(e) =>
                    setLocalKit({
                      ...localKit,
                      logo: { ...localKit.logo, opacity: parseFloat(e.target.value) }
                    })
                  }
                  style={{ width: "100%", marginTop: 8 }}
                />
              </div>
            </div>
          </div>

          {/* Default Subtitles Style */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-color)",
              padding: 24
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Type size={18} color="var(--primary)" />
              Default Subtitles Preset
            </h3>

            <div className="preset-buttons-grid">
              {SUBTITLE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`preset-card-btn ${
                    localKit.subtitles?.preset === p.id ? "active" : ""
                  }`}
                  onClick={() =>
                    setLocalKit({
                      ...localKit,
                      subtitles: { ...localKit.subtitles, preset: p.id, activeColor: p.activeColor }
                    })
                  }
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Mockup Preview */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            Brand Preview (9:16 Short)
          </h3>

          <div
            className="player-aspect-frame ratio-9-16"
            style={{ width: "100%", height: 500, margin: "0 auto" }}
          >
            {/* Background Simulated Video */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)"
              }}
            />

            {/* Top Hook Banner */}
            <div className="player-headline-banner">
              <span className="headline-badge">BRAND PREVIEW ⚡</span>
            </div>

            {/* Brand Logo */}
            {localKit.logo?.url && (
              <img
                src={localKit.logo.url}
                alt="Brand Logo"
                className="player-watermark-logo"
                style={{
                  opacity: localKit.logo.opacity || 0.85,
                  right: localKit.logo.position?.includes("right") ? 16 : "auto",
                  left: localKit.logo.position?.includes("left") ? 16 : "auto",
                  top: localKit.logo.position?.includes("top") ? 16 : "auto",
                  bottom: localKit.logo.position?.includes("bottom") ? 20 : "auto"
                }}
              />
            )}

            {/* Subtitles Preview */}
            <div className="player-subtitle-overlay" style={{ bottom: "20%" }}>
              <div
                className="subtitle-pill-box"
                style={{
                  background: "rgba(0,0,0,0.75)",
                  color: "white",
                  fontSize: 18,
                  fontWeight: 800
                }}
              >
                <span>THIS IS YOUR </span>
                <span style={{ color: localKit.subtitles?.activeColor || "#FFDD00" }}>
                  BRAND STYLE
                </span>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="player-live-progress-bar">
              <div
                className="player-live-progress-fill"
                style={{
                  width: "65%",
                  background: localKit.colors?.primary || "#6c5ce7"
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
