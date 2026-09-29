import React, { useState, useRef } from "react";
import {
  Link as LinkIcon,
  Sparkles,
  Upload,
  Video,
  Radio,
  ArrowRight,
  MoreVertical,
  Play,
  Clock,
  Film,
  Folder,
  Trash2,
  Copy,
  Edit2
} from "lucide-react";
import { formatTime, extractYouTubeId } from "../utils/aiClippingEngine";
import LiveCreatorRadar from "./LiveCreatorRadar";

export default function HomeView({
  projects,
  onOpenSetupModal,
  onOpenProject,
  onOpenRecorder,
  onOpenAgent,
  onDeleteProject,
  onDuplicateProject,
  onFastShortsClip
}) {
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [activeMenuProjectId, setActiveMenuProjectId] = useState(null);
  const fileInputRef = useRef(null);

  const handleUrlSubmit = (e) => {
    e?.preventDefault();
    const url = videoUrlInput.trim();
    if (!url) {
      alert("Please paste a video link or choose a live streamer from the Live Radar.");
      return;
    }
    const ytId = extractYouTubeId(url);
    const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "";
    onOpenSetupModal({
      source: url,
      title: ytId ? "YouTube Video" : "Online Video Project",
      thumbnail: thumb
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenSetupModal({
        source: file,
        title: file.name.replace(/\.[^/.]+$/, ""),
        thumbnail: ""
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onOpenSetupModal({
        source: file,
        title: file.name.replace(/\.[^/.]+$/, ""),
        thumbnail: ""
      });
    }
  };

  const platforms = [
    { name: "YouTube", icon: "🔴" },
    { name: "Google Drive", icon: "📁" },
    { name: "StreamYard", icon: "🦆" },
    { name: "Loom", icon: "🟣" },
    { name: "Twitch", icon: "👾" },
    { name: "Twitter / X", icon: "✖️" },
    { name: "TikTok", icon: "🎵" },
    { name: "Instagram", icon: "📸" },
    { name: "LinkedIn", icon: "💼" },
    { name: "Zoom", icon: "📹" }
  ];

  return (
    <div className="view-scroll-container">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/mp4"
        style={{ display: "none" }}
      />

      {/* Hero Section */}
      <section
        className="workspace-hero-section"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h1 className="hero-main-title">
          Turn your long video into <span className="gradient-text">Viral Clips</span>
        </h1>

        {/* Input Bar */}
        <form
          className="upload-input-container"
          onSubmit={handleUrlSubmit}
          style={{
            borderColor: isDragging ? "var(--primary)" : undefined,
            backgroundColor: isDragging ? "var(--primary-light)" : undefined
          }}
        >
          <LinkIcon size={20} color="var(--primary)" />
          <input
            type="text"
            placeholder={
              isDragging
                ? "Drop your video file here now!"
                : "Paste YouTube link, Loom, Drive... or drag video here"
            }
            value={videoUrlInput}
            onChange={(e) => setVideoUrlInput(e.target.value)}
          />
          <button type="submit" className="get-clips-btn">
            <Sparkles size={16} />
            <span>Get clips</span>
          </button>
        </form>

        {/* Platform Chips */}
        <div className="supported-platforms-bar">
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 4 }}>
            Drop a link from:
          </span>
          {platforms.map((p) => (
            <span key={p.name} className="platform-pill">
              <span>{p.icon}</span>
              <span>{p.name}</span>
            </span>
          ))}
        </div>

        {/* Secondary Action Buttons */}
        <div className="secondary-actions-row">
          <button
            type="button"
            className="action-pill-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} color="var(--primary)" />
            <span>Upload local file</span>
          </button>

          <button
            type="button"
            className="action-pill-btn"
            onClick={() => {
              const url = prompt(
                "Enter Zoom Cloud Recording share URL or paste meeting video link:"
              );
              if (url) {
                onOpenSetupModal({ source: url, title: "Zoom Cloud Recording", thumbnail: "" });
              }
            }}
          >
            <Video size={16} color="#00A9FF" />
            <span>Import from Zoom</span>
          </button>

          <button
            type="button"
            className="action-pill-btn"
            onClick={onOpenRecorder}
          >
            <span className="record-btn-indicator" />
            <span>Record video</span>
          </button>
        </div>

        {/* Agent Intent Ticker */}
        <div className="agent-ticker-banner" onClick={onOpenAgent}>
          <div className="ticker-content">
            <Sparkles size={16} className="ticker-sparkle" />
            <span className="ticker-text">
              <strong>Vizard Agent:</strong> Describe any video concept and let AI auto-generate clips & subtitles.
            </span>
          </div>
          <span className="ticker-link">
            <span>Try Vizard Agent</span>
            <ArrowRight size={14} />
          </span>
        </div>
      </section>

      {/* Live Popularity Creator Radar */}
      <LiveCreatorRadar
        onFastShortsClip={onFastShortsClip}
        onOpenSetupModal={onOpenSetupModal}
      />

      {/* Recent Projects Section */}
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="section-header-row">
          <h2 className="section-title">
            <Film size={18} color="var(--primary)" />
            <span>Your Video Projects</span>
          </h2>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>

        {projects.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px dashed var(--border-color)",
              boxShadow: "var(--shadow-sm)"
            }}
          >
            <Film size={40} color="var(--primary)" style={{ marginBottom: 12, opacity: 0.8 }} />
            <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>No clipped projects yet</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 18, maxWidth: 460, margin: "0 auto 18px" }}>
              Click <strong>⚡ Clip into Shorts</strong> on any live streamer or trending creator in the <strong>Live Radar</strong> above, or paste any video link to generate your first live YouTube Short!
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="get-clips-btn"
                onClick={() => {
                  window.scrollTo({ top: 380, behavior: "smooth" });
                }}
              >
                <Sparkles size={16} />
                <span>Explore Live Radar</span>
              </button>
              <button
                className="action-pill-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                <span>Upload Local File</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((proj) => (
              <div key={proj.id} className="project-card">
                {/* Thumbnail */}
                <div
                  className="project-thumbnail-wrapper"
                  onClick={() => onOpenProject(proj)}
                >
                  <img
                    src={proj.thumbnail || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80"}
                    alt={proj.title}
                  />
                  <div className="thumbnail-overlay">
                    <div className="play-hover-badge">
                      <Play size={20} fill="currentColor" />
                    </div>
                  </div>

                  <span className="thumbnail-duration-tag">
                    {proj.formattedDuration || formatTime(proj.duration)}
                  </span>

                  {proj.clips?.[0]?.viralScore && (
                    <span className="thumbnail-viral-badge">
                      <Sparkles size={11} />
                      <span>{proj.clips[0].viralScore}</span>
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="project-card-body">
                  <div
                    className="project-title"
                    title={proj.title}
                    onClick={() => onOpenProject(proj)}
                  >
                    {proj.title}
                  </div>

                  <div className="project-meta-row">
                    <span className="project-clips-count">
                      <Sparkles size={12} />
                      <span>{proj.clips?.length || 0} clips</span>
                    </span>

                    <span>{new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}</span>

                    {/* Action Dropdown Menu */}
                    <div className="project-card-actions">
                      <button
                        className="header-icon-btn"
                        style={{ width: 28, height: 28 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuProjectId(
                            activeMenuProjectId === proj.id ? null : proj.id
                          );
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeMenuProjectId === proj.id && (
                        <div
                          className="card-menu-dropdown"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            className="dropdown-item"
                            onClick={() => {
                              setActiveMenuProjectId(null);
                              onOpenProject(proj);
                            }}
                          >
                            <Film size={14} />
                            <span>Open in Studio</span>
                          </div>

                          <div
                            className="dropdown-item"
                            onClick={() => {
                              setActiveMenuProjectId(null);
                              onDuplicateProject(proj);
                            }}
                          >
                            <Copy size={14} />
                            <span>Duplicate</span>
                          </div>

                          <div
                            className="dropdown-item"
                            style={{ color: "#ef4444" }}
                            onClick={() => {
                              setActiveMenuProjectId(null);
                              onDeleteProject(proj.id);
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
