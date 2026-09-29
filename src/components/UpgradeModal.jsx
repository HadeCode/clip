import React from "react";
import { Sparkles, Check, X, Zap } from "lucide-react";

export default function UpgradeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const plans = [
    {
      name: "Starter",
      price: "$0",
      period: "forever free",
      minutes: "120 mins / mo",
      features: [
        "Up to 720p export resolution",
        "AI speech-to-text transcription",
        "Basic subtitle presets",
        "Standard export speed"
      ],
      current: true
    },
    {
      name: "Pro Creator",
      price: "$24",
      period: "per month",
      minutes: "1,200 mins / mo",
      popular: true,
      features: [
        "1080p & 4K Ultra-HD export",
        "Word-level animated karaoke captions",
        "Custom Brand Kit & logo watermarks",
        "AI Auto-Framing & Smart Speaker Zoom",
        "Social media direct auto-publishing",
        "Priority GPU rendering queue"
      ]
    },
    {
      name: "Team & Agency",
      price: "$69",
      period: "per month",
      minutes: "6,000 mins / mo",
      features: [
        "Unlimited workspace members",
        "Up to 10 layers of nested folders",
        "Custom fonts and subtitle templates",
        "Dedicated account manager & API"
      ]
    }
  ];

  return (
    <div className="studio-modal-backdrop" onClick={onClose}>
      <div
        className="export-progress-modal"
        style={{ width: 840, maxWidth: "95vw", textAlign: "left", alignItems: "stretch" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800 }}>Upgrade Your Vizard Workspace</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
              Get unlimited viral clips, 4K rendering, and AI auto-reframing
            </p>
          </div>
          <button className="header-icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Plans Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 20 }}>
          {plans.map((p) => (
            <div
              key={p.name}
              style={{
                background: p.popular ? "linear-gradient(180deg, rgba(108, 92, 231, 0.08) 0%, rgba(255, 94, 126, 0.05) 100%)" : "var(--bg-surface-secondary)",
                border: p.popular ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                borderRadius: "var(--radius-lg)",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                position: "relative"
              }}
            >
              {p.popular && (
                <span
                  style={{
                    position: "absolute",
                    top: -11,
                    right: 16,
                    background: "var(--vizard-gradient)",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase"
                  }}
                >
                  Most Popular
                </span>
              )}

              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)" }}>
                {p.name}
              </div>

              <div style={{ margin: "12px 0 6px" }}>
                <span style={{ fontSize: 28, fontWeight: 900 }}>{p.price}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>
                  /{p.period}
                </span>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 16 }}>
                {p.minutes}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, flex: 1 }}>
                {p.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12 }}>
                    <Check size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: "var(--text-secondary)" }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                className={p.popular ? "get-clips-btn" : "action-pill-btn"}
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  alert(`Plan "${p.name}" selected! Your account now has 1,200 mins credits.`);
                  onClose();
                }}
              >
                {p.current ? "Current Plan" : "Upgrade Plan"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
