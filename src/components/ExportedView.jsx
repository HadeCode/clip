import React, { useState } from "react";
import {
  Download,
  Share2,
  Trash2,
  Play,
  Sparkles,
  Calendar,
  Check,
  LayoutGrid,
  List,
  Film
} from "lucide-react";

export default function ExportedView({
  exportedClips,
  onDeleteExportedClip,
  onScheduleClip
}) {
  const [viewMode, setViewMode] = useState("grid");
  const [selectedPreviewClip, setSelectedPreviewClip] = useState(null);
  const [scheduleModalClip, setScheduleModalClip] = useState(null);
  const [schedulePlatform, setSchedulePlatform] = useState("TikTok");
  const [scheduleDate, setScheduleDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [scheduleTime, setScheduleTime] = useState("10:00 AM");
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (clip, e) => {
    if (e) e.stopPropagation();
    if (downloadingId) return;

    setDownloadingId(clip.id);
    const cleanTitle = (clip.title || "vizard-clip").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${cleanTitle}.mp4`;

    try {
      if (!clip.videoUrl) {
        alert("Video file URL is not available for this clip.");
        setDownloadingId(null);
        return;
      }

      // If already a local blob URL or data URL
      if (clip.videoUrl.startsWith("blob:") || clip.videoUrl.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = clip.videoUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloadingId(null);
        return;
      }

      // Remote or backend URL: fetch as blob to ensure browser saves the file instead of opening in a new tab
      const res = await fetch(clip.videoUrl);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.warn("Blob download failed, falling back to direct anchor:", err);
      const a = document.createElement("a");
      a.href = clip.videoUrl;
      a.target = "_blank";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmSchedule = () => {
    if (scheduleModalClip) {
      onScheduleClip({
        clipId: scheduleModalClip.id,
        title: scheduleModalClip.title,
        platform: schedulePlatform,
        date: scheduleDate,
        time: scheduleTime
      });
      alert(`Clip scheduled to post to ${schedulePlatform} on ${scheduleDate} at ${scheduleTime}!`);
      setScheduleModalClip(null);
    }
  };

  return (
    <div className="view-scroll-container">
      {/* Header */}
      <div className="section-header-row" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-main)" }}>
            Exported Clips
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {exportedClips.length} high-engagement clips ready for download and publishing
          </p>
        </div>

        {/* View Switch */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            padding: 2
          }}
        >
          <button
            onClick={() => setViewMode("grid")}
            style={{
              padding: "6px 8px",
              borderRadius: 4,
              background: viewMode === "grid" ? "var(--bg-surface-secondary)" : "transparent",
              color: viewMode === "grid" ? "var(--primary)" : "var(--text-muted)"
            }}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            style={{
              padding: "6px 8px",
              borderRadius: 4,
              background: viewMode === "list" ? "var(--bg-surface-secondary)" : "transparent",
              color: viewMode === "list" ? "var(--primary)" : "var(--text-muted)"
            }}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {exportedClips.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--border-color)"
          }}
        >
          <Film size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <h3>No exported clips yet</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Open any project in Studio and click "Export Clip" to render downloadable viral clips!
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="projects-grid">
          {exportedClips.map((clip) => (
            <div key={clip.id} className="project-card">
              {/* Thumbnail / Video */}
              <div
                className="project-thumbnail-wrapper"
                style={{ aspectRatio: clip.aspectRatio === "9:16" ? "9/16" : "16/9", maxHeight: 300 }}
                onClick={() => setSelectedPreviewClip(clip)}
              >
                {clip.videoUrl ? (
                  <video
                    src={clip.videoUrl}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    muted
                    loop
                    onMouseOver={(e) => e.target.play().catch(() => {})}
                    onMouseOut={(e) => e.target.pause()}
                  />
                ) : (
                  <img src={clip.thumbnail} alt="" />
                )}

                <div className="thumbnail-overlay">
                  <div className="play-hover-badge">
                    <Play size={20} fill="currentColor" />
                  </div>
                </div>

                <span className="thumbnail-viral-badge">
                  <Sparkles size={11} />
                  <span>{clip.viralScore} Viral Score</span>
                </span>

                <span className="thumbnail-duration-tag">
                  {clip.aspectRatio} • {clip.duration}
                </span>
              </div>

              {/* Body */}
              <div className="project-card-body">
                <div className="project-title">{clip.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                  From: {clip.sourceProjectTitle || "Project"} • {clip.fileSize}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button
                    onClick={(e) => handleDownload(clip, e)}
                    disabled={downloadingId === clip.id}
                    className="action-pill-btn"
                    style={{ flex: 1, justifyContent: "center", padding: "8px 12px", fontSize: 12 }}
                  >
                    <Download size={14} className={downloadingId === clip.id ? "spin-icon" : ""} />
                    <span>{downloadingId === clip.id ? "Saving..." : "Download"}</span>
                  </button>

                  <button
                    className="action-pill-btn"
                    style={{ padding: "8px 12px" }}
                    onClick={() => setScheduleModalClip(clip)}
                    title="Schedule / Publish to Socials"
                  >
                    <Share2 size={14} />
                  </button>

                  <button
                    className="header-icon-btn"
                    style={{ width: 34, height: 34, color: "#ef4444" }}
                    onClick={() => onDeleteExportedClip(clip.id)}
                    title="Delete clip"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div
          style={{
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-color)",
            overflow: "hidden"
          }}
        >
          {exportedClips.map((clip, idx) => (
            <div
              key={clip.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: idx < exportedClips.length - 1 ? "1px solid var(--border-color)" : "none",
                gap: 16
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 6,
                  overflow: "hidden",
                  background: "#000",
                  flexShrink: 0
                }}
              >
                {clip.videoUrl ? (
                  <video src={clip.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <img src={clip.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{clip.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {clip.aspectRatio} • {clip.duration} • {clip.fileSize}
                </div>
              </div>

              <div className="viral-badge-pill" style={{ flexShrink: 0 }}>
                <Sparkles size={11} />
                <span>{clip.viralScore}/100</span>
              </div>

              <button
                onClick={(e) => handleDownload(clip, e)}
                disabled={downloadingId === clip.id}
                className="action-pill-btn"
              >
                <Download size={14} className={downloadingId === clip.id ? "spin-icon" : ""} />
                <span>{downloadingId === clip.id ? "Saving..." : "Download"}</span>
              </button>

              <button
                className="action-pill-btn"
                onClick={() => setScheduleModalClip(clip)}
              >
                <Share2 size={14} />
                <span>Share</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Schedule / Share Modal */}
      {scheduleModalClip && (
        <div className="studio-modal-backdrop" onClick={() => setScheduleModalClip(null)}>
          <div
            className="export-progress-modal"
            style={{ width: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Calendar size={32} color="var(--primary)" />
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Schedule Video Post</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {scheduleModalClip.title}
            </p>

            {/* Platform Selector */}
            <div style={{ width: "100%", textAlign: "left" }}>
              <label className="setting-label">Platform</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 6 }}>
                {["TikTok", "YouTube Shorts", "Instagram Reels", "LinkedIn"].map((plat) => (
                  <button
                    key={plat}
                    className={`preset-card-btn ${schedulePlatform === plat ? "active" : ""}`}
                    onClick={() => setSchedulePlatform(plat)}
                  >
                    {plat}
                  </button>
                ))}
              </div>
            </div>

            {/* Date and Time */}
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <div style={{ flex: 1, textAlign: "left" }}>
                <label className="setting-label">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 6,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-surface-secondary)",
                    marginTop: 6
                  }}
                />
              </div>

              <div style={{ flex: 1, textAlign: "left" }}>
                <label className="setting-label">Time</label>
                <input
                  type="text"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 6,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-surface-secondary)",
                    marginTop: 6
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 12 }}>
              <button
                className="get-clips-btn"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={handleConfirmSchedule}
              >
                <Check size={16} />
                <span>Confirm Schedule</span>
              </button>
              <button
                className="action-pill-btn"
                onClick={() => setScheduleModalClip(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {selectedPreviewClip && (
        <div className="studio-modal-backdrop" onClick={() => setSelectedPreviewClip(null)}>
          <div
            style={{
              maxWidth: 400,
              width: "90%",
              background: "#000",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={selectedPreviewClip.videoUrl}
              controls
              autoPlay
              style={{ width: "100%", maxHeight: "80vh", display: "block" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
