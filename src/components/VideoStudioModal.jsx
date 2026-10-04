import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Sparkles,
  Sliders,
  Type,
  FileText,
  Palette,
  Check,
  Share2,
  Copy,
  ChevronLeft
} from "lucide-react";
import confetti from "canvas-confetti";
import { formatTime, extractYouTubeId } from "../utils/aiClippingEngine";
import { SUBTITLE_PRESETS } from "../utils/constants";
import { exportVideoClip } from "../utils/videoRenderer";

export default function VideoStudioModal({
  project,
  initialClipId,
  brandKit,
  onClose,
  onSaveExportedClip
}) {
  const [clips, setClips] = useState(project.clips || []);
  const [selectedClipId, setSelectedClipId] = useState(
    initialClipId || project.clips?.[0]?.id || "clip-1"
  );

  const selectedClip = clips.find((c) => c.id === selectedClipId) || clips[0] || {};

  // Check if source is a YouTube video or direct MP4/webm file
  const youtubeId =
    project.youtubeId ||
    (typeof project.sourceUrl === "string"
      ? extractYouTubeId(project.sourceUrl)
      : null);

  const isDirectCandidate = (u) =>
    typeof u === "string" &&
    !u.includes("youtube.com/watch") &&
    !u.includes("youtu.be/") &&
    !u.includes("twitch.tv/") &&
    !u.includes("kick.com/") &&
    (u.startsWith("blob:") ||
     u.startsWith("data:") ||
     u.endsWith(".mp4") ||
     u.endsWith(".webm") ||
     u.includes("/downloads/") ||
     u.includes(".m3u8") ||
     u.includes("googlevideo.com") ||
     u.includes("cloudfront.net"));

  const playableUrl =
    (isDirectCandidate(selectedClip.videoUrl) ? selectedClip.videoUrl : null) ||
    (isDirectCandidate(project.previewUrl) ? project.previewUrl : null) ||
    (isDirectCandidate(project.sourceUrl) ? project.sourceUrl : null);

  const isDirectVideo = !!playableUrl;

  // Studio Player State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(selectedClip.startTime || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [aspectRatio, setAspectRatio] = useState(selectedClip.aspectRatio || "9:16");
  const [activeTab, setActiveTab] = useState("subtitles"); // subtitles, transcript, brand, ai

  // Trimming State
  const [trimStart, setTrimStart] = useState(selectedClip.startTime || 0);
  const [trimEnd, setTrimEnd] = useState(selectedClip.endTime || project.duration || 15);

  // Dynamic Overlay State
  const [headline, setHeadline] = useState("");
  const [subtitleConfig, setSubtitleConfig] = useState({
    fontFamily: "Plus Jakarta Sans",
    fontSize: 24,
    activeColor: "#FFDD00",
    textColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 3,
    backgroundColor: "rgba(0,0,0,0.75)",
    hasBackgroundBox: true,
    position: "bottom",
    uppercase: true,
    preset: selectedClip.style || "hormozi"
  });

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedResult, setExportedResult] = useState(null);

  const videoRef = useRef(null);

  // Synchronize when selected clip changes
  useEffect(() => {
    if (selectedClip) {
      setTrimStart(selectedClip.startTime || 0);
      setTrimEnd(selectedClip.endTime || project.duration || 15);
      setHeadline("");
      if (videoRef.current) {
        videoRef.current.currentTime = selectedClip.startTime || 0;
      }
    }
  }, [selectedClipId]);

  // Video time update listener for direct video files
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    if (t >= trimEnd) {
      videoRef.current.currentTime = trimStart;
      if (!videoRef.current.paused) {
        videoRef.current.play();
      }
    }
  };

  // Timer loop for YouTube embed streams to keep word-level subtitles synchronized
  useEffect(() => {
    let interval = null;
    if (isPlaying && (!isDirectVideo || !videoRef.current)) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= trimEnd) {
            return trimStart;
          }
          return Number((prev + 0.1).toFixed(1));
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isDirectVideo, trimStart, trimEnd]);

  const togglePlay = () => {
    if (isDirectVideo && videoRef.current) {
      if (videoRef.current.paused) {
        if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
          videoRef.current.currentTime = trimStart;
        }
        videoRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.log(e));
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  // Keyboard shortcut: Spacebar to play/pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, trimStart, trimEnd, isDirectVideo]);

  // Apply Subtitle Preset
  const applyPreset = (preset) => {
    setSubtitleConfig((prev) => ({
      ...prev,
      preset: preset.id,
      fontFamily: preset.fontFamily,
      activeColor: preset.activeColor,
      textColor: preset.textColor,
      strokeColor: preset.strokeColor,
      strokeWidth: preset.strokeWidth,
      hasBackgroundBox: preset.hasBackgroundBox,
      backgroundColor: preset.backgroundColor,
      uppercase: preset.uppercase
    }));
  };

  // Real Video Export Flow
  const handleStartExport = async () => {
    setIsExporting(true);
    setExportProgress(15);
    setExportedResult(null);

    const cleanTitle = (selectedClip.title || project.title || "vizard-clip").replace(/[^a-zA-Z0-9_-]/g, "_");
    const ytUrl = project.youtubeId
      ? `https://www.youtube.com/watch?v=${project.youtubeId}`
      : (typeof project.sourceUrl === "string" && project.sourceUrl.startsWith("http") ? project.sourceUrl : "");

    if (ytUrl) {
      try {
        setExportProgress(35);
        const res = await fetch("http://127.0.0.1:5001/api/download_clip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: ytUrl,
            videoId: project.youtubeId || project.videoId || selectedClip.videoId || "",
            startTime: trimStart,
            endTime: trimEnd,
            aspectRatio: aspectRatio,
            title: cleanTitle,
            headline: "",
            subtitles: project.transcript || selectedClip.transcript || []
          })
        });

        if (res.ok) {
          setExportProgress(85);
          const blob = await res.blob();
          if (blob.size > 20000) {
            const blobUrl = URL.createObjectURL(blob);
            const sizeMb = (blob.size / (1024 * 1024)).toFixed(1);

            const result = {
              url: blobUrl,
              blob: blob,
              formattedSize: `${sizeMb} MB`,
              extension: "mp4"
            };

            setExportProgress(100);
            setExportedResult(result);
            setIsExporting(false);

            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });

            const newExportedItem = {
              id: `exp-${Date.now()}`,
              title: selectedClip.title || project.title,
              sourceProjectTitle: project.title,
              videoUrl: blobUrl,
              aspectRatio: aspectRatio,
              duration: formatTime(trimEnd - trimStart),
              fileSize: `${sizeMb} MB`,
              viralScore: selectedClip.viralScore || 95,
              exportedAt: new Date().toISOString(),
              style: subtitleConfig.preset,
              status: "Exported",
              views: "0",
              shares: "0"
            };
            onSaveExportedClip(newExportedItem);
            return;
          }
        }
      } catch (srvErr) {
        console.warn("Studio server export fallback:", srvErr);
      }
    }

    try {
      const result = await exportVideoClip({
        videoElement: isDirectVideo ? videoRef.current : null,
        thumbnailUrl:
          project.thumbnail ||
          (youtubeId
            ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
            : "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80"),
        startTime: trimStart,
        endTime: trimEnd,
        aspectRatio: aspectRatio,
        subtitles: project.transcript || [],
        subtitleConfig: subtitleConfig,
        headline: "",
        brandKit: brandKit,
        onProgress: (p) => setExportProgress(p)
      });

      setExportedResult(result);
      setIsExporting(false);

      // Trigger Confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Save into app's persistent exported library
      const newExportedItem = {
        id: `exp-${Date.now()}`,
        title: selectedClip.title || project.title,
        sourceProjectTitle: project.title,
        videoUrl: result.url,
        aspectRatio: aspectRatio,
        duration: formatTime(trimEnd - trimStart),
        fileSize: result.formattedSize || "4.5 MB",
        viralScore: selectedClip.viralScore || 95,
        exportedAt: new Date().toISOString(),
        style: subtitleConfig.preset,
        status: "Exported",
        views: "0",
        shares: "0"
      };

      onSaveExportedClip(newExportedItem);
    } catch (err) {
      console.error(err);
      alert("Export encountered an issue: " + err.message);
      setIsExporting(false);
    }
  };

  // Active Subtitle Cue based on currentTime
  const activeCue = (project.transcript || []).find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  const clipProgressPercent = Math.min(
    100,
    Math.max(0, ((currentTime - trimStart) / Math.max(0.1, trimEnd - trimStart)) * 100)
  );

  return (
    <div className="studio-modal-backdrop" onClick={onClose}>
      <div
        className="studio-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Studio Top Header Bar */}
        <div className="studio-modal-header">
          <div className="studio-header-left">
            <button className="back-btn" onClick={onClose}>
              <ChevronLeft size={18} />
              <span>Back to Workspace</span>
            </button>
            <div style={{ width: 1, height: 20, background: "var(--border-color)" }} />
            <input
              type="text"
              className="studio-project-title-input"
              value={project.title}
              readOnly
            />
          </div>

          <div className="studio-header-right">
            {/* Aspect Ratio Switcher */}
            <div className="aspect-ratio-selector">
              <button
                className={`ratio-btn ${aspectRatio === "9:16" ? "active" : ""}`}
                onClick={() => setAspectRatio("9:16")}
                title="9:16 Vertical (TikTok, Reels, Shorts)"
              >
                9:16
              </button>
              <button
                className={`ratio-btn ${aspectRatio === "1:1" ? "active" : ""}`}
                onClick={() => setAspectRatio("1:1")}
                title="1:1 Square (Instagram, LinkedIn)"
              >
                1:1
              </button>
              <button
                className={`ratio-btn ${aspectRatio === "16:9" ? "active" : ""}`}
                onClick={() => setAspectRatio("16:9")}
                title="16:9 Landscape (YouTube, Desktop)"
              >
                16:9
              </button>
            </div>

            {/* Export Button */}
            <button className="export-clip-btn" onClick={handleStartExport}>
              <Download size={16} />
              <span>Export Clip</span>
            </button>

            <button className="header-icon-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Studio Body 3-Column Grid */}
        <div className="studio-body-grid">
          {/* Left Column: Viral Clips List */}
          <div className="studio-clips-panel">
            <div className="panel-header-title">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={16} color="var(--primary)" />
                AI Generated Clips ({clips.length})
              </span>
            </div>

            <div className="clips-scroll-list">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className={`clip-list-card ${
                    clip.id === selectedClipId ? "selected" : ""
                  }`}
                  onClick={() => setSelectedClipId(clip.id)}
                >
                  <div className="clip-card-header">
                    <div className="viral-badge-pill">
                      <Sparkles size={12} />
                      <span>{clip.viralScore}/100</span>
                    </div>
                    <span className="clip-duration-text">
                      {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                    </span>
                  </div>

                  <div className="clip-card-title">{clip.title}</div>
                  <div className="clip-card-summary">{clip.summary}</div>

                  {clip.scoreBreakdown && (
                    <div className="viral-metrics-bars">
                      <div className="metric-bar-item">
                        <span>Hook Strength</span>
                        <div className="mini-track">
                          <div
                            className="mini-fill"
                            style={{ width: `${clip.scoreBreakdown.hook}%` }}
                          />
                        </div>
                      </div>
                      <div className="metric-bar-item">
                        <span>Retention</span>
                        <div className="mini-track">
                          <div
                            className="mini-fill"
                            style={{ width: `${clip.scoreBreakdown.retention}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Center Stage: Video Canvas Player */}
          <div className="studio-center-stage">
            <div className={`player-aspect-frame ratio-${aspectRatio.replace(":", "-")}`}>
              {/* Direct HTML5 Video Player OR Real YouTube Embed Player */}
              {isDirectVideo ? (
                <video
                  ref={videoRef}
                  src={playableUrl}
                  className="studio-video-element"
                  playsInline
                  crossOrigin="anonymous"
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : youtubeId ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#000"
                  }}
                >
                  {/* Ambient dynamic background for vertical reframing */}
                  <div
                    style={{
                      position: "absolute",
                      inset: -20,
                      backgroundImage: `url(${project.thumbnail || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "blur(24px) brightness(0.35)",
                      transform: "scale(1.2)"
                    }}
                  />

                  {/* Real YouTube Embed Player */}
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&controls=1&rel=0&start=${Math.floor(trimStart)}`}
                    title={project.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={{
                      width: aspectRatio === "9:16" ? "178%" : "100%",
                      height: aspectRatio === "9:16" ? "100%" : "100%",
                      border: "none",
                      position: "relative",
                      zIndex: 2,
                      pointerEvents: "auto"
                    }}
                  />
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={project.sourceUrl || project.metadata?.url}
                  className="studio-video-element"
                  playsInline
                  crossOrigin="anonymous"
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              )}

              {/* Play/Pause Center Trigger (Only for direct video, YouTube iframe has native controls) */}
              {isDirectVideo && !isPlaying && (
                <div className="player-center-trigger" onClick={togglePlay}>
                  <div className="center-play-icon">
                    <Play size={28} fill="currentColor" />
                  </div>
                </div>
              )}

              {/* Top Hook Headline Banner */}
              {headline && (
                <div className="player-headline-banner">
                  <span className="headline-badge">{headline.toUpperCase()}</span>
                </div>
              )}

              {/* Brand Logo Watermark */}
              {brandKit?.logo?.url && brandKit?.watermarkEnabled === true && (
                <img
                  src={brandKit.logo.url}
                  alt="Brand"
                  className="player-watermark-logo"
                  style={{ opacity: brandKit.logo.opacity || 0.85 }}
                />
              )}

              {/* Live Animated Subtitle Layer */}
              {activeCue && (
                <div
                  className="player-subtitle-overlay"
                  style={{
                    bottom: subtitleConfig.position === "middle" ? "40%" : subtitleConfig.position === "top" ? "75%" : "15%",
                    zIndex: 10
                  }}
                >
                  <div
                    className="subtitle-pill-box"
                    style={{
                      fontFamily: subtitleConfig.fontFamily,
                      fontSize: `${subtitleConfig.fontSize}px`,
                      fontWeight: 800,
                      backgroundColor: subtitleConfig.hasBackgroundBox ? subtitleConfig.backgroundColor : "transparent",
                      color: subtitleConfig.textColor,
                      WebkitTextStroke: `${subtitleConfig.strokeWidth}px ${subtitleConfig.strokeColor}`
                    }}
                  >
                    {activeCue.words && activeCue.words.length > 0 ? (
                      activeCue.words.map((wObj, idx) => {
                        const isWordActive = currentTime >= wObj.start && currentTime <= wObj.end;
                        const wordText = subtitleConfig.uppercase ? wObj.word.toUpperCase() : wObj.word;
                        return (
                          <span
                            key={idx}
                            className={`word-karaoke-item ${isWordActive ? "active" : ""}`}
                            style={{
                              color: isWordActive ? subtitleConfig.activeColor : subtitleConfig.textColor
                            }}
                          >
                            {wordText}
                          </span>
                        );
                      })
                    ) : (
                      <span>
                        {subtitleConfig.uppercase ? activeCue.text.toUpperCase() : activeCue.text}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Live Progress Bar */}
              <div className="player-live-progress-bar">
                <div
                  className="player-live-progress-fill"
                  style={{ width: `${clipProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Bottom Controls Bar with Trimmer */}
            <div className="studio-bottom-controls-bar">
              {/* Timeline Scrubber */}
              <div
                className="timeline-scrubber-track"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickPercent = (e.clientX - rect.left) / rect.width;
                  const newTime = clickPercent * (project.duration || 15);
                  if (videoRef.current) {
                    videoRef.current.currentTime = newTime;
                  } else {
                    setCurrentTime(newTime);
                  }
                }}
              >
                {/* Active Clip Selected Segment */}
                <div
                  className="timeline-clip-range"
                  style={{
                    left: `${(trimStart / (project.duration || 15)) * 100}%`,
                    width: `${((trimEnd - trimStart) / (project.duration || 15)) * 100}%`
                  }}
                />
                {/* Playhead */}
                <div
                  className="timeline-playhead"
                  style={{
                    left: `${(currentTime / (project.duration || 15)) * 100}%`
                  }}
                />
              </div>

              {/* Controls Row */}
              <div className="controls-button-row">
                <div className="controls-left-group">
                  <button
                    className="header-icon-btn"
                    style={{ color: "white" }}
                    onClick={togglePlay}
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>

                  <button
                    className="header-icon-btn"
                    style={{ color: "white" }}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = trimStart;
                      } else {
                        setCurrentTime(trimStart);
                      }
                    }}
                    title="Restart Clip"
                  >
                    <RotateCcw size={16} />
                  </button>

                  <button
                    className="header-icon-btn"
                    style={{ color: "white" }}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isMuted;
                        setIsMuted(!isMuted);
                      }
                    }}
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>

                  <div className="timecode-label">
                    {formatTime(currentTime)} / {formatTime(trimEnd)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Speed Button */}
                  <select
                    value={playbackSpeed}
                    onChange={(e) => {
                      const sp = parseFloat(e.target.value);
                      setPlaybackSpeed(sp);
                      if (videoRef.current) videoRef.current.playbackRate = sp;
                    }}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      color: "white",
                      border: "none",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12
                    }}
                  >
                    <option value="0.75" style={{ color: "black" }}>0.75x</option>
                    <option value="1" style={{ color: "black" }}>1.0x</option>
                    <option value="1.25" style={{ color: "black" }}>1.25x</option>
                    <option value="1.5" style={{ color: "black" }}>1.5x</option>
                    <option value="2" style={{ color: "black" }}>2.0x</option>
                  </select>

                  <button
                    className="header-icon-btn"
                    style={{ color: "white" }}
                    onClick={() => {
                      if (videoRef.current?.requestFullscreen) {
                        videoRef.current.requestFullscreen();
                      }
                    }}
                  >
                    <Maximize size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Customization Studio Panels */}
          <div className="studio-tools-panel">
            <div className="tools-tabs-nav">
              <button
                className={`tool-tab-btn ${activeTab === "subtitles" ? "active" : ""}`}
                onClick={() => setActiveTab("subtitles")}
              >
                <Type size={14} style={{ display: "inline", marginRight: 4 }} />
                Subtitles
              </button>
              <button
                className={`tool-tab-btn ${activeTab === "transcript" ? "active" : ""}`}
                onClick={() => setActiveTab("transcript")}
              >
                <FileText size={14} style={{ display: "inline", marginRight: 4 }} />
                Transcript
              </button>
              <button
                className={`tool-tab-btn ${activeTab === "brand" ? "active" : ""}`}
                onClick={() => setActiveTab("brand")}
              >
                <Palette size={14} style={{ display: "inline", marginRight: 4 }} />
                Brand & Style
              </button>
            </div>

            <div className="tools-tab-content">
              {/* SUBTITLES TAB */}
              {activeTab === "subtitles" && (
                <>
                  <div className="tool-setting-group">
                    <label className="setting-label">Caption Style Presets</label>
                    <div className="preset-buttons-grid">
                      {SUBTITLE_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          className={`preset-card-btn ${
                            subtitleConfig.preset === p.id ? "active" : ""
                          }`}
                          onClick={() => applyPreset(p)}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="tool-setting-group">
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <label className="setting-label">Font Size</label>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        {subtitleConfig.fontSize}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="16"
                      max="42"
                      value={subtitleConfig.fontSize}
                      onChange={(e) =>
                        setSubtitleConfig({
                          ...subtitleConfig,
                          fontSize: parseInt(e.target.value)
                        })
                      }
                    />
                  </div>

                  <div className="tool-setting-group">
                    <label className="setting-label">Font Family</label>
                    <select
                      value={subtitleConfig.fontFamily}
                      onChange={(e) =>
                        setSubtitleConfig({
                          ...subtitleConfig,
                          fontFamily: e.target.value
                        })
                      }
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-surface-secondary)",
                        color: "var(--text-main)"
                      }}
                    >
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Bold)</option>
                      <option value="Inter">Inter (Clean Minimal)</option>
                      <option value="JetBrains Mono">JetBrains Mono (Tech/Punchy)</option>
                    </select>
                  </div>

                  <div className="tool-setting-group">
                    <label className="setting-label">Active Word Highlight Color</label>
                    <div className="color-picker-row">
                      <input
                        type="color"
                        className="color-circle-input"
                        value={subtitleConfig.activeColor}
                        onChange={(e) =>
                          setSubtitleConfig({
                            ...subtitleConfig,
                            activeColor: e.target.value
                          })
                        }
                      />
                      <span style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>
                        {subtitleConfig.activeColor}
                      </span>
                    </div>
                  </div>

                  <div className="tool-setting-group">
                    <label className="setting-label">Position</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["bottom", "middle", "top"].map((pos) => (
                        <button
                          key={pos}
                          className={`preset-card-btn ${
                            subtitleConfig.position === pos ? "active" : ""
                          }`}
                          style={{ flex: 1, textTransform: "capitalize" }}
                          onClick={() =>
                            setSubtitleConfig({ ...subtitleConfig, position: pos })
                          }
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="tool-setting-group">
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={subtitleConfig.uppercase}
                        onChange={(e) =>
                          setSubtitleConfig({
                            ...subtitleConfig,
                            uppercase: e.target.checked
                          })
                        }
                      />
                      <span>ALL UPPERCASE (High Retention)</span>
                    </label>
                  </div>
                </>
              )}

              {/* TRANSCRIPT TAB */}
              {activeTab === "transcript" && (
                <div className="tool-setting-group">
                  <label className="setting-label">
                    Synced Transcript (Click word to jump video)
                  </label>
                  <div className="transcript-cues-list">
                    {(project.transcript || []).map((cue, idx) => {
                      const isCueActive = currentTime >= cue.start && currentTime <= cue.end;
                      return (
                        <div
                          key={idx}
                          className={`transcript-cue-item ${
                            isCueActive ? "active" : ""
                          }`}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = cue.start;
                            } else {
                              setCurrentTime(cue.start);
                            }
                          }}
                        >
                          <div className="cue-timestamp">
                            {formatTime(cue.start)} - {formatTime(cue.end)}
                          </div>
                          <div className="cue-text">{cue.text}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* BRAND & OVERLAYS TAB */}
              {activeTab === "brand" && (
                <>
                  <div className="tool-setting-group">
                    <label className="setting-label">Top Headline Hook Banner</label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. STOP MAKING THIS MISTAKE 🤯"
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-surface-secondary)",
                        color: "var(--text-main)",
                        fontWeight: 700
                      }}
                    />
                  </div>

                  <div className="tool-setting-group">
                    <label className="setting-label">Clip Trimming (Seconds)</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Start</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={trimEnd}
                          value={trimStart}
                          onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                          style={{
                            width: "100%",
                            padding: 8,
                            borderRadius: 6,
                            border: "1px solid var(--border-color)",
                            background: "var(--bg-surface-secondary)"
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>End</span>
                        <input
                          type="number"
                          step="0.5"
                          min={trimStart}
                          max={project.duration || 15}
                          value={trimEnd}
                          onChange={(e) => setTrimEnd(parseFloat(e.target.value) || 15)}
                          style={{
                            width: "100%",
                            padding: 8,
                            borderRadius: 6,
                            border: "1px solid var(--border-color)",
                            background: "var(--bg-surface-secondary)"
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="tool-setting-group">
                    <label className="setting-label">Recommended Hashtags</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(selectedClip.hashtags || ["#viral", "#growth", "#shorts"]).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            borderRadius: 4,
                            background: "var(--primary-light)",
                            color: "var(--primary)",
                            fontWeight: 600
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Real Export In-Progress Modal */}
        {isExporting && (
          <div className="studio-modal-backdrop">
            <div className="export-progress-modal">
              <Sparkles size={36} color="var(--primary)" className="pulse" />
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>
                Rendering Viral Clip...
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Burning dynamic animated subtitles, hook banner & aspect ratio
              </p>

              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>

              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                {exportProgress}%
              </span>
            </div>
          </div>
        )}

        {/* Export Completed Dialog */}
        {exportedResult && (
          <div className="studio-modal-backdrop">
            <div className="export-progress-modal">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#10b981",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Check size={28} />
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 800 }}>Clip Exported Successfully!</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Rendered in {aspectRatio} format • Size: {exportedResult.formattedSize}
              </p>
              <div style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
                ✓ Also saved to your <strong>Exported</strong> library tab!
              </div>

              <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 8 }}>
                <a
                  href={exportedResult.url}
                  download={`${(selectedClip.title || project.title || "vizard-viral-clip").replace(/[^a-zA-Z0-9_-]/g, "_")}_${aspectRatio.replace(":", "-")}.${exportedResult.extension || "mp4"}`}
                  className="get-clips-btn"
                  style={{ flex: 1, textDecoration: "none", justifyContent: "center", gap: 8, padding: "12px 20px" }}
                >
                  <Download size={18} />
                  <span>Download Video Now</span>
                </a>

                <button
                  className="action-pill-btn"
                  onClick={() => setExportedResult(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
