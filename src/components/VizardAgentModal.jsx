import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, X, Radio, Check, Link as LinkIcon } from "lucide-react";
import { AGENT_ROTATING_PROMPTS } from "../utils/constants";

export default function VizardAgentModal({
  isOpen,
  onClose,
  onGenerateWithAgent
}) {
  const [prompt, setPrompt] = useState("");
  const [liveCreators, setLiveCreators] = useState([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("http://127.0.0.1:5001/api/creators/live")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.creators) && data.creators.length > 0) {
            setLiveCreators(data.creators.slice(0, 6));
            setSelectedCreatorId(data.creators[0].id);
          }
        })
        .catch((e) => console.warn("Agent modal creator load error", e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunAgent = () => {
    const finalPrompt = prompt.trim() || "Cut this into high-engagement viral YouTube Shorts with animated captions";
    let videoSource = "";
    let title = "Vizard Agent - " + finalPrompt.slice(0, 30);

    if (customUrl.trim()) {
      videoSource = customUrl.trim();
      title = "Custom Stream Clip - " + finalPrompt.slice(0, 25);
    } else {
      const chosen = liveCreators.find((c) => c.id === selectedCreatorId) || liveCreators[0];
      if (chosen) {
        videoSource = chosen.url;
        title = `${chosen.creator} - ${chosen.title || "Live Stream"}`;
      }
    }

    if (!videoSource) {
      alert("Please select a live creator or paste a video URL.");
      return;
    }

    onGenerateWithAgent({
      source: videoSource,
      title: title,
      prompt: finalPrompt,
      isYouTubeShorts: true
    });
    onClose();
  };

  return (
    <div className="studio-modal-backdrop" onClick={onClose}>
      <div
        className="export-progress-modal"
        style={{ width: 620, textAlign: "left", alignItems: "stretch" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={20} color="var(--accent-pink)" />
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Vizard AI Real-Time Agent</h3>
          </div>
          <button className="header-icon-btn" onClick={onClose} style={{ width: 30, height: 30 }}>
            <X size={18} />
          </button>
        </div>

        {/* Prompt Input */}
        <div style={{ marginTop: 16 }}>
          <label className="setting-label">Describe your YouTube Shorts clipping intent:</label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Find the funniest reaction moment, crop to 9:16 vertical, add bold yellow Hormozi captions..."
            style={{
              width: "100%",
              padding: 12,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              background: "var(--bg-surface-secondary)",
              color: "var(--text-main)",
              fontSize: 14,
              marginTop: 6,
              resize: "none"
            }}
          />
        </div>

        {/* Quick Suggestion Chips */}
        <div>
          <label className="setting-label">Popular Prompts</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {AGENT_ROTATING_PROMPTS.map((p) => (
              <button
                key={p}
                className="action-pill-btn"
                style={{ fontSize: 11, padding: "6px 10px" }}
                onClick={() => setPrompt(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Real Live Streamer / Creator Selection */}
        <div style={{ marginTop: 14 }}>
          <label className="setting-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Radio size={13} color="#ff0055" />
            <span>Select Real-Time Live Broadcaster or Creator:</span>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 8 }}>
            {liveCreators.map((c) => (
              <div
                key={c.id}
                className={`preset-card-btn ${selectedCreatorId === c.id && !customUrl ? "active" : ""}`}
                onClick={() => {
                  setSelectedCreatorId(c.id);
                  setCustomUrl("");
                }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", fontSize: 12 }}
              >
                <img
                  src={c.avatar}
                  alt={c.creator}
                  style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }}
                />
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <div style={{ fontWeight: 700 }}>{c.creator}</div>
                  <div style={{ fontSize: 10, color: c.isLive ? "#ff0055" : "var(--text-muted)" }}>
                    {c.isLive ? "● LIVE" : "Recent"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom URL Option */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-surface-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "6px 10px" }}>
            <LinkIcon size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Or paste any live Twitch stream or YouTube URL..."
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: "var(--text-main)", width: "100%" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button className="action-pill-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="get-clips-btn" onClick={handleRunAgent}>
            <Sparkles size={16} />
            <span>Generate Shorts with Agent</span>
          </button>
        </div>
      </div>
    </div>
  );
}
