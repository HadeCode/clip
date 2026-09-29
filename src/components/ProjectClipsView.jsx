import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Film,
  Share2,
  MoreHorizontal,
  Diamond,
  HelpCircle,
  Sparkles,
  Download,
  Send,
  Edit3,
  Trash2,
  SlidersHorizontal,
  Play,
  Pause,
  Scissors,
  Layers,
  Wand2,
  Plus,
  Check,
  X,
  Volume2,
  VolumeX,
  Maximize2,
  MessageSquare,
  Info,
  Copy,
  ShieldCheck,
  Flame,
  ThumbsUp,
  ThumbsDown,
  RotateCcw
} from "lucide-react";
import { formatTime, recurateClipsWithPrompt } from "../utils/aiClippingEngine";
import { exportVideoClip } from "../utils/videoRenderer";

function YouTubeIcon({ size = 16, color = "#ff0000" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

export default function ProjectClipsView({
  project = {},
  onBack,
  onOpenStudio,
  onScheduleClip,
  onSaveExportedClip,
  onUpdateProject,
  onOpenUpgrade
}) {
  const safeProject = project || {};
  const [clips, setClips] = useState(Array.isArray(safeProject.clips) ? safeProject.clips : []);
  const [selectedClipId, setSelectedClipId] = useState(clips[0]?.id || null);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState({});
  const [playingClipId, setPlayingClipId] = useState(null);
  const [showTopBanner, setShowTopBanner] = useState(true);
  const [sortBy, setSortBy] = useState("score"); // score | longest | shortest | order
  const [downloadingClipId, setDownloadingClipId] = useState(null);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [qualityMap, setQualityMap] = useState({});
  const [currentTimeMap, setCurrentTimeMap] = useState({});
  const [scheduleModalClip, setScheduleModalClip] = useState(null);

  // Opus Clip workflow additions
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [isRecurating, setIsRecurating] = useState(false);
  const [recurateProgress, setRecurateProgress] = useState(0);
  const [recurateStatusText, setRecurateStatusText] = useState("");
  const [activeScoreBreakdownClip, setActiveScoreBreakdownClip] = useState(null);
  const [safeZoneEnabledMap, setSafeZoneEnabledMap] = useState({});
  const [copiedClipId, setCopiedClipId] = useState(null);

  // References for video elements per clip
  const videoRefs = useRef({});
  const cardRefs = useRef({});

  // Ensure clips have virality score and reason
  useEffect(() => {
    if (safeProject && Array.isArray(safeProject.clips)) {
      setClips(safeProject.clips);
      if (safeProject.clips.length > 0) {
        setSelectedClipId((prev) => prev || safeProject.clips[0]?.id);
      }
    }
  }, [project]);

  // Server-rendered preview MP4 stream resolution for online streams (Twitch, Kick, YouTube)
  const [serverPreviewUrl, setServerPreviewUrl] = useState(
    safeProject.previewUrl ||
    (typeof safeProject.sourceUrl === "string" &&
      (safeProject.sourceUrl.startsWith("blob:") ||
       safeProject.sourceUrl.endsWith(".mp4") ||
       safeProject.sourceUrl.endsWith(".webm") ||
       safeProject.sourceUrl.includes("/downloads/"))
      ? safeProject.sourceUrl
      : null)
  );
  const [mutedMap, setMutedMap] = useState({});
  const [liveTranscript, setLiveTranscript] = useState(safeProject.transcript || []);

  useEffect(() => {
    let isMounted = true;
    let pollInterval = null;
    let attempts = 0;

    const directCandidate =
      safeProject.previewUrl ||
      (typeof safeProject.sourceUrl === "string" &&
        (safeProject.sourceUrl.startsWith("blob:") ||
         safeProject.sourceUrl.endsWith(".mp4") ||
         safeProject.sourceUrl.endsWith(".webm") ||
         safeProject.sourceUrl.includes("/downloads/"))
        ? safeProject.sourceUrl
        : null);

    if (directCandidate) {
      setServerPreviewUrl(directCandidate);
    }

    const vidId = safeProject.videoId || safeProject.youtubeId;
    const srcUrl = safeProject.sourceUrl || "";

    const checkMedia = async () => {
      if (!vidId && !srcUrl) return;
      try {
        const res = await fetch("http://127.0.0.1:5001/api/get_clip_media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: srcUrl, videoId: vidId || "" })
        });
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          if (data.videoUrl) {
            setServerPreviewUrl(data.videoUrl);
          }
          if (Array.isArray(data.transcript) && data.transcript.length > 0) {
            setLiveTranscript(data.transcript);
          }
          // If both video and authentic transcript are ready, stop polling
          if (data.ready && Array.isArray(data.transcript) && data.transcript.length > 0) {
            if (pollInterval) clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.warn("Could not fetch clip media preview:", err);
      }
    };

    checkMedia();

    // Poll every 2.5 seconds up to 30 times (75s) to guarantee video and Whisper subtitles load
    pollInterval = setInterval(() => {
      attempts++;
      if (attempts > 30) {
        if (pollInterval) clearInterval(pollInterval);
        return;
      }
      checkMedia();
    }, 2500);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [project]);

  // Helper: Get authentic speech cues for a clip, prioritizing Whisper transcription over template placeholders
  const getAuthenticClipCues = (clip) => {
    if (!clip) return [];

    // 1. If live authentic transcript from Whisper is available, filter cues for this clip window
    if (Array.isArray(liveTranscript) && liveTranscript.length > 0) {
      const cStart = clip.startTime || 0;
      const cEnd = clip.endTime || (cStart + (clip.duration || 15));
      const matched = liveTranscript.filter((c) => {
        const s = typeof c?.start === "number" ? c.start : (typeof c?.startTime === "number" ? c.startTime : 0);
        return s >= Math.max(0, cStart - 1.5) && s <= (cEnd + 1.5);
      });
      if (matched.length > 0) return matched;
      return liveTranscript;
    }

    // 2. If clip.transcript has real non-placeholder lines
    if (Array.isArray(clip.transcript) && clip.transcript.length > 0) {
      const isPlaceholder = clip.transcript.some((t) => 
        /watch this play|paddle|hydration|skull|frying pan|blinded by the storm|impossible clutch/i.test(t?.text || "")
      );
      if (!isPlaceholder) return clip.transcript;
    }

    // 3. Fallback to project transcript
    if (Array.isArray(safeProject.transcript) && safeProject.transcript.length > 0) {
      return safeProject.transcript;
    }

    return clip.transcript || [];
  };

  // Sort clips
  const sortedClips = [...(clips || [])].filter(Boolean).sort((a, b) => {
    if (!a || !b) return 0;
    if (sortBy === "score") return (b.viralScore || 0) - (a.viralScore || 0);
    if (sortBy === "longest") return (b.duration || 0) - (a.duration || 0);
    if (sortBy === "shortest") return (a.duration || 0) - (b.duration || 0);
    if (sortBy === "order") return (a.startTime || 0) - (b.startTime || 0);
    return 0;
  });

  // Select all checkbox state
  const allSelected = clips.length > 0 && clips.every((c) => c && selectedCheckboxes[c.id]);
  const someSelected = clips.some((c) => c && selectedCheckboxes[c.id]);
  const selectedCount = Object.values(selectedCheckboxes).filter(Boolean).length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedCheckboxes({});
    } else {
      const next = {};
      clips.forEach((c) => {
        next[c.id] = true;
      });
      setSelectedCheckboxes(next);
    }
  };

  const toggleSelectClip = (id) => {
    setSelectedCheckboxes((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Scroll to clip card when thumbnail clicked
  const handleSelectThumbnail = (clipId) => {
    setSelectedClipId(clipId);
    if (cardRefs.current[clipId]) {
      cardRefs.current[clipId].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Toggle video playback
  const togglePlay = (clip) => {
    const video = videoRefs.current[clip.id];
    if (!video) {
      setPlayingClipId((prev) => (prev === clip.id ? null : clip.id));
      return;
    }

    if (video.paused) {
      // Pause all other clips
      Object.entries(videoRefs.current).forEach(([id, el]) => {
        if (id !== String(clip.id) && el && !el.paused) {
          el.pause();
        }
      });
      const vDur = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : null;
      let start = clip.startTime || 0;
      let end = clip.endTime || (start + (clip.duration || 15));
      if (vDur && start >= vDur) {
        start = (clip.startTime || 0) % Math.max(1, vDur - 10);
        end = Math.min(vDur, start + (clip.duration || 15));
      }
      if (video.currentTime < start || video.currentTime >= end) {
        video.currentTime = start;
      }
      video.play()
        .then(() => setPlayingClipId(clip.id))
        .catch((err) => {
          console.warn("Audio autoplay restricted, trying muted:", err);
          video.muted = true;
          setMutedMap((prev) => ({ ...prev, [clip.id]: true }));
          video.play().then(() => setPlayingClipId(clip.id)).catch(() => {});
        });
    } else {
      video.pause();
      setPlayingClipId(null);
    }
  };

  // Replay clip from its start timestamp
  const handleReplayClip = (clip, e) => {
    if (e) e.stopPropagation();
    const video = videoRefs.current[clip.id];
    if (video) {
      Object.entries(videoRefs.current).forEach(([id, el]) => {
        if (id !== String(clip.id) && el && !el.paused) {
          el.pause();
        }
      });
      const vDur = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : null;
      let start = clip.startTime || 0;
      if (vDur && start >= vDur) {
        start = (clip.startTime || 0) % Math.max(1, vDur - 10);
      }
      video.currentTime = start;
      video.play()
        .then(() => setPlayingClipId(clip.id))
        .catch(() => {
          video.muted = true;
          setMutedMap((prev) => ({ ...prev, [clip.id]: true }));
          video.play().then(() => setPlayingClipId(clip.id)).catch(() => {});
        });
    } else {
      setPlayingClipId(clip.id);
    }
  };

  // Toggle Mute/Unmute
  const toggleMuteClip = (clip, e) => {
    if (e) e.stopPropagation();
    const video = videoRefs.current[clip.id];
    if (video) {
      const nextMuted = !video.muted;
      video.muted = nextMuted;
      setMutedMap((prev) => ({ ...prev, [clip.id]: nextMuted }));
    }
  };

  // Direct single-clip download with Real Video cutting
  const handleDownloadClip = async (clip, e) => {
    if (e) e.stopPropagation();
    if (downloadingClipId) return;

    setDownloadingClipId(clip.id);
    const cleanTitle = (clip.title || "vizard-viral-clip").replace(/[^a-zA-Z0-9_-]/g, "_");

    // 1. If clip already has a rendered videoUrl blob or local video file, download directly!
    if (clip.videoUrl && (clip.videoUrl.startsWith("blob:") || clip.videoUrl.startsWith("http"))) {
      try {
        const a = document.createElement("a");
        a.href = clip.videoUrl;
        a.download = `${cleanTitle}_9-16.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloadingClipId(null);
        return;
      } catch (err) {
        console.warn("Direct blob download failed, falling back to server cut", err);
      }
    }

    // 2. Try real server-cut Full HD 9:16 vertical MP4 video with real audio via POST JSON
    const ytUrl = project.youtubeId 
      ? `https://www.youtube.com/watch?v=${project.youtubeId}` 
      : (project.sourceUrl && project.sourceUrl.startsWith("http") ? project.sourceUrl : "");

    if (ytUrl) {
      try {
        const vEl = videoRefs.current[clip.id];
        const vDur = vEl && vEl.duration && !isNaN(vEl.duration) && vEl.duration > 0 ? vEl.duration : null;
        let startSec = Math.floor(clip.startTime || 0);
        let endSec = Math.ceil(clip.endTime || (startSec + (clip.duration || 15)));
        if (vDur && startSec >= vDur) {
          startSec = Math.floor((clip.startTime || 0) % Math.max(1, vDur - 10));
          endSec = Math.ceil(Math.min(vDur, startSec + (clip.duration || 15)));
        }

        const res = await fetch("http://127.0.0.1:5001/api/download_clip", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: ytUrl,
            videoId: safeProject.videoId || clip.videoId || "",
            previewUrl: safeProject.previewUrl || serverPreviewUrl || clip.videoUrl || "",
            startTime: startSec,
            endTime: endSec,
            aspectRatio: clip.aspectRatio || "9:16",
            title: cleanTitle,
            headline: clip.headline || clip.title || "",
            subtitles: getAuthenticClipCues(clip)
          })
        });


        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Store rendered MP4 onto clip so player can replay this exact cut video!
        clip.videoUrl = blobUrl;

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${cleanTitle}_9-16.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

        // Save into app's persistent exported library
        const exportedItem = {
          id: `exp-${Date.now()}`,
          title: clip.title,
          sourceProjectTitle: project.title,
          videoUrl: blobUrl,
          aspectRatio: clip.aspectRatio || "9:16",
          duration: formatTime(clip.duration || 15),
          fileSize: `${(blob.size / (1024 * 1024)).toFixed(1)} MB`,
          viralScore: clip.viralScore || 96,
          exportedAt: new Date().toISOString(),
          style: "Hormozi Pop",
          status: "Exported",
          views: "0",
          shares: "0"
        };
        onSaveExportedClip?.(exportedItem);
        setDownloadingClipId(null);
        return;
      } catch (srvErr) {
        console.warn("Direct server download exception, trying canvas fallback:", srvErr);
      }
    }

    try {
      // 3. Client-side canvas export fallback
      const result = await exportVideoClip({
        videoElement: videoRefs.current[clip.id] || null,
        thumbnailUrl: project.thumbnail || (project.youtubeId ? `https://img.youtube.com/vi/${project.youtubeId}/maxresdefault.jpg` : ""),
        startTime: clip.startTime || 0,
        endTime: clip.endTime || (clip.startTime || 0) + (clip.duration || 15),
        aspectRatio: clip.aspectRatio || "9:16",
        subtitles: getAuthenticClipCues(clip),
        subtitleConfig: { preset: "hormozi", fontFamily: "Inter", activeColor: "#ffff00", textColor: "#ffffff", strokeColor: "#000000", strokeWidth: 4, uppercase: true },
        headline: clip.headline || clip.title,
        onProgress: () => {}
      });

      // Save into app's persistent exported library
      const exportedItem = {
        id: `exp-${Date.now()}`,
        title: clip.title,
        sourceProjectTitle: project.title,
        videoUrl: result.url,
        aspectRatio: clip.aspectRatio || "9:16",
        duration: formatTime(clip.duration || 15),
        fileSize: result.formattedSize || "4.8 MB",
        viralScore: clip.viralScore || 96,
        exportedAt: new Date().toISOString(),
        style: "Hormozi Pop",
        status: "Exported",
        views: "0",
        shares: "0"
      };
      onSaveExportedClip?.(exportedItem);

      // Trigger instant browser download
      const a = document.createElement("a");
      a.href = result.url;
      a.download = `${cleanTitle}_9-16.${result.extension || "mp4"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Canvas export failed:", err);
      if (project.sourceUrl && (project.sourceUrl.endsWith(".mp4") || project.sourceUrl.includes("/downloads/"))) {
        const a = document.createElement("a");
        a.href = project.sourceUrl;
        a.download = `${cleanTitle}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("Download encountered an issue: " + err.message);
      }
    } finally {
      setDownloadingClipId(null);
    }
  };

  // Batch download selected clips
  const handleBatchDownload = async () => {
    const toDownload = clips.filter((c) => selectedCheckboxes[c.id]);
    if (toDownload.length === 0) return;

    setIsBatchDownloading(true);
    for (const clip of toDownload) {
      await handleDownloadClip(clip);
      await new Promise((r) => setTimeout(r, 600));
    }
    setIsBatchDownloading(false);
  };

  // Delete selected clips
  const handleDeleteSelected = () => {
    if (selectedCount === 0) return;
    if (window.confirm(`Delete ${selectedCount} selected clip(s)?`)) {
      setClips((prev) => prev.filter((c) => !selectedCheckboxes[c.id]));
      setSelectedCheckboxes({});
    }
  };

  // Opus Clip CoPilot: Re-curate clips dynamically with custom prompt
  const handleCoPilotRecurate = async (overridePrompt) => {
    const promptToUse = (typeof overridePrompt === "string" ? overridePrompt : copilotPrompt).trim();
    if (!promptToUse) return;

    setIsRecurating(true);
    setRecurateProgress(20);
    setRecurateStatusText("Opus ClipAnything™ analyzing speech patterns & transcript...");

    try {
      const nextClips = await recurateClipsWithPrompt({
        project: safeProject,
        customPrompt: promptToUse,
        keywords: promptToUse,
        preferredDuration: "30-60",
        onProgress: (prog, text) => {
          setRecurateProgress(prog);
          setRecurateStatusText(text);
        }
      });

      setClips(nextClips);
      if (nextClips.length > 0) {
        setSelectedClipId(nextClips[0].id);
      }
      onUpdateProject?.({
        ...safeProject,
        clips: nextClips,
        clipsCount: nextClips.length
      });
      setCopilotPrompt("");
    } catch (err) {
      console.error(err);
      alert("CoPilot error: " + err.message);
    } finally {
      setIsRecurating(false);
    }
  };

  // Copy YouTube Shorts Title & Hashtags
  const handleCopyShortsInfo = (clip) => {
    const tags = Array.isArray(clip.hashtags) && clip.hashtags.length > 0
      ? clip.hashtags.join(" ")
      : "#Shorts #YouTubeShorts #Viral";
    const textToCopy = `${clip.headline || clip.title} 🤯 ${tags}`;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedClipId(clip.id);
    setTimeout(() => setCopiedClipId(null), 2500);
  };

  // 1-Click Upload to YouTube Shorts
  const handleUploadToYouTubeShorts = (clip) => {
    const tags = Array.isArray(clip.hashtags) && clip.hashtags.length > 0
      ? clip.hashtags.join(" ")
      : "#Shorts #YouTubeShorts #Viral #CreatorMoments";
    const titleText = `${clip.headline || clip.title} 🤯 #Shorts`;
    const fullDesc = `${clip.headline || clip.title}\n\nAuto-clipped & captioned into YouTube Shorts with Vizard AI.\n\n${tags}`;

    navigator.clipboard?.writeText(`${titleText}\n\n${fullDesc}`);
    setCopiedClipId(clip.id);

    // Open YouTube Studio Upload in a new tab
    window.open("https://studio.youtube.com/channel/upload", "_blank");

    alert("🚀 YouTube Shorts title & viral hashtags copied to your clipboard!\n\nYouTube Studio is opened in a new tab. Just drag and drop your downloaded clip!");
  };

  // Toggle Safe Zone
  const toggleSafeZone = (clipId) => {
    setSafeZoneEnabledMap((prev) => ({
      ...prev,
      [clipId]: !prev[clipId]
    }));
  };

  return (
    <div className="project-clips-view-container">
      {/* 1. Header Row matching screenshot */}
      <header className="project-clips-header">
        <div className="header-left-cluster">
          <button className="icon-back-btn" onClick={onBack} title="Back to workspace">
            <ChevronLeft size={20} />
          </button>

          <div className="header-video-source-badge">
            {project.youtubeId ? (
              <div className="source-yt-icon">
                <YouTubeIcon size={16} color="#ff0000" />
              </div>
            ) : (
              <div className="source-film-icon">
                <Film size={15} color="var(--primary)" />
              </div>
            )}
            <span className="project-header-title">{project.title}</span>
            <button
              className="edit-original-video-link"
              onClick={() => onOpenStudio(project, null)}
              title="Open full video editor"
            >
              Edit original video
            </button>
          </div>
        </div>

        <div className="header-right-cluster">
          <button
            className="header-pill-action"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              alert("Project link copied to clipboard!");
            }}
          >
            <Share2 size={15} />
            <span>Share</span>
          </button>

          <button className="header-icon-square" title="More options">
            <MoreHorizontal size={18} />
          </button>

          <div className="upgrade-diamond-btn" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", borderColor: "#059669", cursor: "default" }} title="Pro Plan Active - Unlimited Access & Zero Watermarks">
            <Sparkles size={14} color="#ffffff" />
            <span style={{ color: "#ffffff", fontWeight: 800 }}>PRO • UNLIMITED</span>
          </div>

          <button className="header-icon-square" title="Help & Tutorials">
            <HelpCircle size={18} />
          </button>

          <div className="user-profile-circle-avatar" title="Account">
            h
          </div>
        </div>
      </header>

      {/* Main Scrollable Body */}
      <div className="project-clips-main-scroll">
        {/* 2. Top "Try AI Edit" Promo Banner */}
        {showTopBanner && (
          <div className="try-ai-edit-banner">
            <div className="ai-edit-banner-left">
              <div className="banner-preview-card">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
                  alt="Original"
                  className="banner-img-original"
                />
                <div className="banner-split-divider" />
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80"
                  alt="AI Enhanced"
                  className="banner-img-enhanced"
                />
                <span className="banner-pill-tag">READY TO GROW?</span>
              </div>

              <div className="banner-text-content">
                <h2 className="banner-title">
                  Try AI <span className="gradient-text-purple">Edit</span>
                </h2>
                <p className="banner-subtitle">
                  AI that edits like a professional editor would. Edits with taste, not just speed.
                </p>
              </div>
            </div>

            <div className="ai-edit-banner-right">
              <button
                className="banner-try-now-btn"
                onClick={() => onOpenStudio(project, clips[0]?.id)}
              >
                <span>Try now</span>
                <span style={{ fontSize: 16 }}>→</span>
              </button>
              <button
                className="banner-close-btn"
                onClick={() => setShowTopBanner(false)}
                title="Dismiss banner"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* 3. Batch Action Toolbar */}
        <div className="clips-batch-toolbar">
          <div className="toolbar-left-group">
            <label className="checkbox-label-container">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="custom-checkbox"
              />
              <span className="checkbox-text">
                Select all {selectedCount > 0 && `(${selectedCount})`}
              </span>
            </label>

            <button
              className={`toolbar-btn ${selectedCount > 0 ? "active-publish" : "disabled"}`}
              disabled={selectedCount === 0}
              onClick={() => {
                const first = clips.find((c) => selectedCheckboxes[c.id]);
                if (first) setScheduleModalClip(first);
              }}
            >
              <Send size={14} />
              <span>Publish</span>
            </button>

            <button
              className="toolbar-btn"
              disabled={selectedCount === 0 || isBatchDownloading}
              onClick={handleBatchDownload}
            >
              <Download size={14} className={isBatchDownloading ? "spin-icon" : ""} />
              <span>{isBatchDownloading ? "Downloading..." : "Download"}</span>
            </button>

            <button
              className="toolbar-btn"
              disabled={selectedCount === 0}
              onClick={() => {
                const first = clips.find((c) => selectedCheckboxes[c.id]);
                if (first) onOpenStudio(project, first.id);
              }}
            >
              <Edit3 size={14} />
              <span>Edit clips</span>
            </button>

            <button
              className="toolbar-btn-icon"
              disabled={selectedCount === 0}
              onClick={handleDeleteSelected}
              title="Delete selected clips"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="toolbar-right-group">
            <button className="toolbar-btn-icon" title="Filter & settings">
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* 4. Sub-bar: Category badge, count, and sort dropdown */}
        <div className="clips-subbar-row">
          <div className="subbar-left">
            <div className="ai-clip-version-badge">
              <Sparkles size={13} color="var(--primary)" />
              <span>[V1] AI CLIP</span>
            </div>
            <span className="clips-count-label">{clips.length} clips</span>
          </div>

          <div className="subbar-right">
            <select
              className="sort-dropdown-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="score">Highest score</option>
              <option value="longest">Longest duration</option>
              <option value="shortest">Shortest duration</option>
              <option value="order">Video order</option>
            </select>
          </div>
        </div>

        {/* Opus Clip ClipAnything™ AI CoPilot Prompt-to-Clip Bar */}
        <div className="opus-copilot-banner">
          <div className="copilot-header-line">
            <div className="copilot-brand-badge">
              <Sparkles size={16} color="var(--primary)" />
              <span className="copilot-title">ClipAnything™ AI CoPilot</span>
              <span className="copilot-tag">OPUS PRO WORKFLOW</span>
            </div>
            <span className="copilot-helper-text">
              Prompt the AI in plain English to find specific scenes, topics, hooks, or quotes across the video
            </span>
          </div>

          <form
            className="copilot-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleCoPilotRecurate();
            }}
          >
            <div className="copilot-input-wrapper">
              <input
                type="text"
                className="copilot-text-input"
                placeholder='e.g. "Find moments with high drama", "Show when they debate the prize", "Funniest bloopers"'
                value={copilotPrompt}
                onChange={(e) => setCopilotPrompt(e.target.value)}
                disabled={isRecurating}
              />
              <button
                type="submit"
                className="copilot-submit-btn"
                disabled={!copilotPrompt.trim() || isRecurating}
              >
                <Wand2 size={15} />
                <span>{isRecurating ? "Analyzing..." : "Re-curate Clips"}</span>
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="copilot-chips-row">
              <span className="chips-label">Quick Prompts:</span>
              {[
                "🔥 High Energy Hooks (<30s)",
                "💡 Key Insights & Quotes",
                "😱 High Drama & Climax",
                "🤣 Funny Reactions & Bloopers",
                "💬 Debates & Strong Opinions"
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="copilot-chip-btn"
                  disabled={isRecurating}
                  onClick={() => {
                    const clean = chip.replace(/^[^\w]+/, "").trim();
                    setCopilotPrompt(clean);
                    handleCoPilotRecurate(clean);
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </form>

          {isRecurating && (
            <div className="copilot-progress-bar-box">
              <div className="copilot-progress-text-row">
                <span>{recurateStatusText}</span>
                <span>{recurateProgress}%</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${recurateProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* 5. Two-Column Workspace */}
        <div className="project-clips-layout-grid">
          {/* Left Column: Vertical Thumbnails Navigation */}
          <div className="clips-left-sidebar-nav">
            <div className="sidebar-nav-header">
              <div className="nav-header-left">
                <button className="sidebar-toggle-btn" title="Toggle clips panel">
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ width: 14, height: 2, background: "currentColor", borderRadius: 1 }} />
                    <div style={{ width: 10, height: 2, background: "currentColor", borderRadius: 1 }} />
                    <div style={{ width: 14, height: 2, background: "currentColor", borderRadius: 1 }} />
                  </div>
                </button>
                <span className="sidebar-badge-text">[V1] AI CLIP</span>
              </div>
            </div>

            <div className="sidebar-thumbnails-scroll">
              {sortedClips.map((clip, idx) => {
                const isSelected = selectedClipId === clip.id;
                return (
                  <div
                    key={clip.id}
                    className={`nav-clip-item ${isSelected ? "selected-nav" : ""}`}
                    onClick={() => handleSelectThumbnail(clip.id)}
                  >
                    <div className="nav-thumb-box">
                      <img
                        src={
                          project.thumbnail ||
                          (project.youtubeId
                            ? `https://img.youtube.com/vi/${project.youtubeId}/mqdefault.jpg`
                            : "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&auto=format&fit=crop&q=80")
                        }
                        alt=""
                        className="nav-thumb-img"
                      />
                      <span className="nav-index-tag">{idx + 1}</span>
                    </div>

                    <div className="nav-title-box">
                      <div className="nav-clip-title" title={clip.title}>
                        {clip.title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Main Scrollable Feed of Clip Cards */}
          <div className="clips-main-feed-column">
            {sortedClips.map((clip, idx) => {
              const isChecked = !!selectedCheckboxes[clip.id];
              const isPlaying = playingClipId === clip.id;
              const viralityDisplay =
                clip.viralityScore ||
                (clip.viralScore ? (clip.viralScore / 10).toFixed(1) : "9.5");
              const viralReasonText =
                clip.viralReason ||
                "The peak intensity of the video: a dangerous, self-described 'dumb' stunt that pushes the participants to their limits.";
              const clipDurationFormatted = clip.formattedDuration || `${Math.round(clip.duration || 14)}s`;
              const quality = qualityMap[clip.id] || "720p";

              // Resolve authentic playable vertical video stream
              const isDirectSource =
                typeof safeProject.sourceUrl === "string" &&
                (safeProject.sourceUrl.startsWith("blob:") ||
                 safeProject.sourceUrl.endsWith(".mp4") ||
                 safeProject.sourceUrl.endsWith(".webm") ||
                 safeProject.sourceUrl.includes("/downloads/"));

              const twitchMatch =
                typeof safeProject.sourceUrl === "string" &&
                safeProject.sourceUrl.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
              const twitchChannel = twitchMatch ? twitchMatch[1] : null;

              const playableVideo =
                clip.videoUrl ||
                serverPreviewUrl ||
                safeProject.previewUrl ||
                (isDirectSource ? safeProject.sourceUrl : null) ||
                (safeProject.videoId ? `http://127.0.0.1:5001/downloads/${safeProject.videoId}_preview.mp4` : null);

              const currentClipTime = currentTimeMap[clip.id] ?? (clip.startTime || 0);
              const clipCues = getAuthenticClipCues(clip);
              const activeCue = clipCues.find(
                (cue) => {
                  const s = typeof cue?.start === "number" ? cue.start : (typeof cue?.startTime === "number" ? cue.startTime : 0);
                  const e = typeof cue?.end === "number" ? cue.end : (typeof cue?.endTime === "number" ? cue.endTime : s + 3);
                  return currentClipTime >= s && currentClipTime <= e;
                }
              ) || clipCues[0];
              const isMuted = !!mutedMap[clip.id];

              return (
                <div
                  key={clip.id}
                  ref={(el) => (cardRefs.current[clip.id] = el)}
                  className={`vizard-clip-card-container ${selectedClipId === clip.id ? "focused-card" : ""}`}
                  onClick={() => setSelectedClipId(clip.id)}
                >
                  {/* Top-left Card Checkbox */}
                  <div className="card-top-checkbox">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelectClip(clip.id)}
                      className="custom-checkbox"
                    />
                  </div>

                  {/* 2-Part Card Interior */}
                  <div className="clip-card-inner-flex">
                    {/* LEFT: 9:16 Video Player Container */}
                    <div className="card-video-player-column">
                      {/* Quality Selector Dropdown + Shorts Safe Zone Toggle */}
                      <div className="card-quality-picker">
                        <select
                          value={quality}
                          onChange={(e) =>
                            setQualityMap((prev) => ({ ...prev, [clip.id]: e.target.value }))
                          }
                          className="quality-select-pill"
                        >
                          <option value="720p">720p ▾</option>
                          <option value="1080p">1080p HD</option>
                          <option value="4K">4K Ultra</option>
                        </select>

                        <button
                          type="button"
                          className={`shorts-safezone-toggle-btn ${safeZoneEnabledMap[clip.id] ? "active-safezone" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSafeZone(clip.id);
                          }}
                          title="Preview YouTube Shorts Safe Zone UI overlay"
                        >
                          <ShieldCheck size={13} />
                          <span>{safeZoneEnabledMap[clip.id] ? "Shorts UI: ON" : "Shorts Safe Zone"}</span>
                        </button>
                      </div>

                      {/* Video Player Frame with Ambient Blurred Wings */}
                      <div className="vertical-916-player-wrapper">
                        {/* Ambient Backdrop Blur */}
                        <div
                          className="player-ambient-blur"
                          style={{
                            backgroundImage: `url(${
                              safeProject.thumbnail ||
                              (safeProject.youtubeId
                                ? `https://img.youtube.com/vi/${safeProject.youtubeId}/mqdefault.jpg`
                                : "")
                            })`
                          }}
                        />

                        {/* Video Element or YouTube / Twitch Stream Embed */}
                        {playableVideo ? (
                          <video
                            ref={(el) => (videoRefs.current[clip.id] = el)}
                            src={playableVideo}
                            className="vertical-inner-video"
                            playsInline
                            crossOrigin="anonymous"
                            onTimeUpdate={(e) => {
                              const t = e.target.currentTime;
                              setCurrentTimeMap((prev) => ({ ...prev, [clip.id]: t }));
                              const vDur = e.target.duration && !isNaN(e.target.duration) && e.target.duration > 0 ? e.target.duration : null;
                              let start = clip.startTime || 0;
                              let end = clip.endTime || (start + (clip.duration || 15));
                              if (vDur && start >= vDur) {
                                start = (clip.startTime || 0) % Math.max(1, vDur - 10);
                                end = Math.min(vDur, start + (clip.duration || 15));
                              }
                              if (t >= end || t < start) {
                                e.target.currentTime = start;
                              }
                            }}
                            onLoadedMetadata={(e) => {
                              const vDur = e.target.duration && !isNaN(e.target.duration) && e.target.duration > 0 ? e.target.duration : null;
                              let start = clip.startTime || 0;
                              if (vDur && start >= vDur) {
                                start = (clip.startTime || 0) % Math.max(1, vDur - 10);
                              }
                              if (start > 0) {
                                e.target.currentTime = start;
                              }
                            }}
                            onEnded={(e) => {
                              const vDur = e.target.duration && !isNaN(e.target.duration) && e.target.duration > 0 ? e.target.duration : null;
                              let start = clip.startTime || 0;
                              if (vDur && start >= vDur) {
                                start = (clip.startTime || 0) % Math.max(1, vDur - 10);
                              }
                              e.target.currentTime = start;
                              e.target.play().catch(() => {});
                            }}
                          />
                        ) : safeProject.youtubeId ? (
                          <div className="youtube-player-standin">
                            {isPlaying ? (
                              <iframe
                                key={`yt-${clip.id}`}
                                src={`https://www.youtube-nocookie.com/embed/${safeProject.youtubeId}?start=${Math.floor(clip.startTime || 0)}&autoplay=1&mute=0&controls=0&modestbranding=1&rel=0`}
                                title={clip.title}
                                className="vertical-inner-iframe"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              />
                            ) : (
                              <img
                                src={
                                  safeProject.thumbnail ||
                                  `https://img.youtube.com/vi/${safeProject.youtubeId}/maxresdefault.jpg`
                                }
                                alt=""
                                className="vertical-inner-video"
                                style={{ objectFit: "cover" }}
                              />
                            )}
                          </div>
                        ) : twitchChannel ? (
                          <div className="youtube-player-standin">
                            {isPlaying ? (
                              <iframe
                                key={`twitch-${clip.id}`}
                                src={`https://player.twitch.tv/?channel=${twitchChannel}&parent=localhost&parent=127.0.0.1&autoplay=true&muted=false`}
                                title={clip.title}
                                className="vertical-inner-iframe"
                                allowFullScreen
                              />
                            ) : (
                              <img
                                src={safeProject.thumbnail || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80"}
                                alt=""
                                className="vertical-inner-video"
                                style={{ objectFit: "cover" }}
                              />
                            )}
                          </div>
                        ) : (
                          <img
                            src={safeProject.thumbnail || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80"}
                            alt=""
                            className="vertical-inner-video"
                            style={{ objectFit: "cover" }}
                          />
                        )}

                        {/* Subtitle & Hook Overlays on the Video Preview */}
                        <div className="video-card-overlays">
                          {/* Top Hook Banner */}
                          <div className="video-hook-badge">
                            {clip.headline || clip.title}
                          </div>

                          {/* Active Subtitle Phrase Preview */}
                          <div className="video-subtitle-phrase">
                            <span className="subtitle-karaoke-highlight">
                              {activeCue?.text || clip.transcript?.[0]?.text || "Bro was not ready for this 😂"}
                            </span>
                          </div>

                          {/* Duration Tag Badge */}
                          <div className="video-duration-pill">
                            00:{String(Math.round(clip.duration || 14)).padStart(2, "0")}
                          </div>

                          {/* Replay Button overlay */}
                          <button
                            type="button"
                            className="video-overlay-btn-left"
                            title="Replay clip from start"
                            onClick={(e) => handleReplayClip(clip, e)}
                          >
                            <RotateCcw size={15} />
                          </button>

                          {/* Mute / Unmute Toggle Overlay */}
                          {playableVideo && (
                            <button
                              type="button"
                              className="video-overlay-btn-right"
                              title={isMuted ? "Unmute audio" : "Mute audio"}
                              onClick={(e) => toggleMuteClip(clip, e)}
                            >
                              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                            </button>
                          )}

                          {/* Big Play/Pause Center Button Overlay */}
                          <button
                            type="button"
                            className="video-center-play-btn"
                            title={isPlaying ? "Pause" : "Play"}
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlay(clip);
                            }}
                          >
                            {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 3 }} />}
                          </button>

                          {/* YouTube Shorts Safe Zone Realistic Mobile Overlay */}
                          {safeZoneEnabledMap[clip.id] && (
                            <div className="shorts-safezone-overlay-frame">
                              <div className="shorts-safe-bounding-box">
                                <span className="shorts-safe-tag">
                                  <ShieldCheck size={11} /> Shorts Safe Content Zone
                                </span>
                              </div>

                              {/* Right-hand Social Rail */}
                              <div className="shorts-mock-right-rail">
                                <div className="mock-rail-btn">
                                  <ThumbsUp size={16} />
                                  <span>148K</span>
                                </div>
                                <div className="mock-rail-btn">
                                  <ThumbsDown size={16} />
                                  <span>Dislike</span>
                                </div>
                                <div className="mock-rail-btn">
                                  <MessageSquare size={16} />
                                  <span>1.8K</span>
                                </div>
                                <div className="mock-rail-btn">
                                  <Share2 size={16} />
                                  <span>Share</span>
                                </div>
                                <div className="mock-rail-btn">
                                  <Scissors size={15} />
                                  <span>Remix</span>
                                </div>
                                <div className="mock-rail-disc" />
                              </div>

                              {/* Bottom Channel Info */}
                              <div className="shorts-mock-bottom-bar">
                                <div className="shorts-mock-channel-row">
                                  <div className="shorts-mock-avatar" />
                                  <span className="shorts-mock-handle">
                                    @{((clip.creator || safeProject.creator || safeProject.uploader || "Creator").replace(/\s+/g, "").toLowerCase())}
                                  </span>
                                  <span className="shorts-mock-sub-pill">Subscribe</span>
                                </div>
                                <div className="shorts-mock-title-line">
                                  {clip.headline || clip.title}
                                </div>
                                <div className="shorts-mock-audio-line">
                                  ♫ {clip.creator || safeProject.creator || "Original Stream Audio"} · Viral Shorts
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Metadata, Virality Score, Actions, Viral Reason, Transcript */}
                    <div className="card-details-column">
                      {/* Title & Options Row */}
                      <div className="card-title-row">
                        <h3 className="card-clip-heading">
                          #{idx + 1} {clip.title}
                        </h3>
                        <div className="card-title-icons">
                          <button
                            className="icon-action-btn"
                            onClick={() => onOpenStudio(project, clip.id)}
                            title="AI Magic Edit"
                          >
                            <Sparkles size={16} color="var(--primary)" />
                          </button>
                          <button className="icon-action-btn" title="More options">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </div>

                      <button className="plus-add-scene-btn" title="Add chapter/hook">
                        <Plus size={15} />
                      </button>

                      {/* Virality Score + Action Buttons Row */}
                      <div className="virality-actions-row">
                        {/* Virality Score with 4-Pillar Opener */}
                        <div
                          className="virality-score-block clickable-virality"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveScoreBreakdownClip(clip);
                          }}
                          title="Click to view Opus 4-Pillar Virality Breakdown (Hook, Flow, Engagement, Trend)"
                        >
                          <div className="virality-number">
                            {viralityDisplay}
                            <Info size={12} className="virality-info-badge-icon" />
                          </div>
                          <div className="virality-label">OPUS VIRALITY</div>
                        </div>

                        {/* Buttons Row */}
                        <div className="actions-button-group">
                          {/* Publish */}
                          <button
                            className="btn-purple-publish"
                            onClick={() => setScheduleModalClip(clip)}
                          >
                            <Send size={14} />
                            <span>Publish</span>
                          </button>

                          {/* Download */}
                          <button
                            className="btn-outlined-action"
                            disabled={downloadingClipId === clip.id}
                            onClick={(e) => handleDownloadClip(clip, e)}
                          >
                            <Download size={14} className={downloadingClipId === clip.id ? "spin-icon" : ""} />
                            <span>{downloadingClipId === clip.id ? "Exporting..." : "Download"}</span>
                          </button>

                          {/* HD AI Enhance */}
                          <button
                            className="btn-outlined-action"
                            onClick={() => alert("AI HD Enhancer activated! 1080p 60FPS sharpness applied.")}
                          >
                            <Wand2 size={14} />
                            <span>AI Enhance</span>
                          </button>

                          {/* Copy Shorts Meta */}
                          <button
                            className="btn-outlined-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyShortsInfo(clip);
                            }}
                            title="Copy YouTube Shorts title and viral hashtags to clipboard"
                          >
                            {copiedClipId === clip.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                            <span>{copiedClipId === clip.id ? "Copied Tags!" : "Shorts Meta"}</span>
                          </button>

                          {/* 1-Click Upload to YouTube Shorts */}
                          <button
                            className="btn-purple-publish"
                            style={{
                              background: "linear-gradient(135deg, #ff0000 0%, #b30000 100%)",
                              borderColor: "#ff0000"
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUploadToYouTubeShorts(clip);
                            }}
                            title="Copy viral Shorts title & tags, then open YouTube Studio upload"
                          >
                            <YouTubeIcon size={14} color="#ffffff" />
                            <span>Upload to Shorts</span>
                          </button>

                          {/* Share */}
                          <button
                            className="btn-icon-square"
                            onClick={() => {
                              navigator.clipboard?.writeText(window.location.href);
                              alert("Clip share link copied!");
                            }}
                            title="Share clip"
                          >
                            <Share2 size={15} />
                          </button>

                          {/* Layout */}
                          <button
                            className="btn-icon-square"
                            onClick={() => onOpenStudio(project, clip.id)}
                            title="Change layout & aspect ratio"
                          >
                            <Layers size={15} />
                          </button>

                          {/* Scissors / Trim / Studio Editor */}
                          <button
                            className="btn-icon-square"
                            onClick={() => onOpenStudio(project, clip.id)}
                            title="Edit clip subtitles & trimmer"
                          >
                            <Scissors size={15} />
                          </button>
                        </div>
                      </div>

                      {/* YouTube Shorts Readiness Banner */}
                      <div className="shorts-publish-helper-card">
                        <div className="shorts-helper-title-row">
                          <div className="shorts-helper-badge">
                            <YouTubeIcon size={15} color="#ff0000" />
                            <span>YouTube Shorts Ready (9:16 Vertical · {clip.duration}s)</span>
                          </div>
                          <button
                            className="action-pill-btn"
                            style={{ fontSize: 11, padding: "3px 8px" }}
                            onClick={() => handleCopyShortsInfo(clip)}
                          >
                            {copiedClipId === clip.id ? "✓ Copied" : "Copy Title & Tags"}
                          </button>
                        </div>
                        <div className="shorts-meta-box">
                          <strong>Title:</strong> {clip.headline || clip.title} #Shorts
                        </div>
                      </div>

                      {/* Viral Reason Callout Box */}
                      <div className="viral-reason-box">
                        <div className="viral-reason-title">Viral reason</div>
                        <div className="viral-reason-text">{viralReasonText}</div>
                      </div>

                      {/* Transcript with Timestamps */}
                      <div className="card-transcript-container">
                        {(getAuthenticClipCues(clip).length > 0
                          ? getAuthenticClipCues(clip)
                          : [
                            { start: clip.startTime || 0, text: "Transcribing authentic stream audio with Whisper AI..." },
                            { start: (clip.startTime || 0) + 4, text: "Syncing voice audio to video frames..." }
                          ]
                        ).map((line, lIdx) => {
                          const lineStart = typeof line === "object" && typeof line?.start === "number" 
                            ? line.start 
                            : (typeof line?.startTime === "number" ? line.startTime : 0);
                          const lineText = typeof line === "object" ? line?.text || "" : String(line || "");
                          const min = Math.floor(lineStart / 60) || 0;
                          const sec = Math.floor(lineStart % 60) || 0;
                          const timeStr = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

                          return (
                            <div
                              key={lIdx}
                              className="transcript-line-row"
                              onClick={() => {
                                const video = videoRefs.current[clip.id];
                                if (video) {
                                  const vDur = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : null;
                                  const targetTime = vDur && lineStart >= vDur ? (lineStart % Math.max(1, vDur - 10)) : lineStart;
                                  video.currentTime = targetTime;
                                  video.play();
                                  setPlayingClipId(clip.id);
                                }
                              }}
                            >
                              <span className="transcript-time-badge">{timeStr}</span>
                              <span className="transcript-cue-text">{lineText}</span>
                            </div>
                          );
                        })}

                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. Floating Help / Chat Widget in bottom right */}
      <button
        className="floating-vizard-chat-bubble"
        onClick={() => alert("Vizard AI Assistant: Need help picking viral moments or scheduling clips?")}
        title="Vizard Help & Support"
      >
        <MessageSquare size={22} color="#ffffff" />
      </button>

      {/* Schedule / Publish Modal */}
      {scheduleModalClip && (
        <div className="studio-modal-backdrop" onClick={() => setScheduleModalClip(null)}>
          <div className="export-progress-modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <Send size={32} color="var(--primary)" />
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Publish to Socials</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {scheduleModalClip.title}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, width: "100%", margin: "12px 0" }}>
              {["TikTok", "YouTube Shorts", "Instagram Reels", "LinkedIn"].map((p) => (
                <button
                  key={p}
                  className="preset-card-btn active"
                  onClick={() => {
                    onScheduleClip?.({
                      clipId: scheduleModalClip.id,
                      title: scheduleModalClip.title,
                      platform: p,
                      date: new Date().toISOString().split("T")[0],
                      time: "10:00 AM"
                    });
                    alert(`Clip scheduled for automatic publishing to ${p}!`);
                    setScheduleModalClip(null);
                  }}
                >
                  Post to {p}
                </button>
              ))}
            </div>

            <button className="action-pill-btn" onClick={() => setScheduleModalClip(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Opus ClipGenius™ 4-Pillar Virality Score Breakdown Modal */}
      {activeScoreBreakdownClip && (
        <div className="studio-modal-backdrop" onClick={() => setActiveScoreBreakdownClip(null)}>
          <div className="opus-virality-modal" onClick={(e) => e.stopPropagation()}>
            <div className="opus-modal-header">
              <div className="opus-header-brand">
                <Sparkles size={20} color="var(--primary)" />
                <div>
                  <h3 className="opus-title-heading">Opus ClipGenius™ Virality Score</h3>
                  <p className="opus-subtitle-heading">AI Predictive YouTube Shorts Algorithm Breakdown</p>
                </div>
              </div>
              <button
                className="opus-close-btn"
                onClick={() => setActiveScoreBreakdownClip(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="opus-score-hero">
              <div className="opus-big-score-ring">
                <span className="opus-score-val">
                  {activeScoreBreakdownClip.viralScore || Math.round((activeScoreBreakdownClip.viralityScore || 9.5) * 10)}
                </span>
                <span className="opus-score-max">/99</span>
              </div>
              <div className="opus-hero-meta">
                <div className="opus-tier-badge">
                  <Flame size={14} color="#ff5722" /> Top 1% Viral Candidate
                </div>
                <h4 className="opus-clip-name">{activeScoreBreakdownClip.title}</h4>
                <p className="opus-meta-text">{activeScoreBreakdownClip.viralReason}</p>
              </div>
            </div>

            <div className="opus-pillars-list">
              <h4 className="opus-pillars-title">The 4 Virality Pillars</h4>

              {/* Pillar 1: Hook */}
              <div className="opus-pillar-card">
                <div className="pillar-header-row">
                  <div className="pillar-name">
                    <span className="pillar-icon">🎣</span>
                    <strong>Hook Impact (First 3s)</strong>
                  </div>
                  <span className="pillar-score-percent">
                    {activeScoreBreakdownClip.scoreBreakdown?.hook || 98}%
                  </span>
                </div>
                <div className="pillar-progress-track">
                  <div
                    className="pillar-progress-bar bar-purple"
                    style={{ width: `${activeScoreBreakdownClip.scoreBreakdown?.hook || 98}%` }}
                  />
                </div>
                <p className="pillar-desc">
                  Viewer retention in first 2.5 seconds. Captures curiosity before scroll-away.
                </p>
              </div>

              {/* Pillar 2: Flow */}
              <div className="opus-pillar-card">
                <div className="pillar-header-row">
                  <div className="pillar-name">
                    <span className="pillar-icon">⚡</span>
                    <strong>Story Flow & Pacing</strong>
                  </div>
                  <span className="pillar-score-percent">
                    {activeScoreBreakdownClip.scoreBreakdown?.flow || 95}%
                  </span>
                </div>
                <div className="pillar-progress-track">
                  <div
                    className="pillar-progress-bar bar-blue"
                    style={{ width: `${activeScoreBreakdownClip.scoreBreakdown?.flow || 95}%` }}
                  />
                </div>
                <p className="pillar-desc">
                  Seamless editing cadence. AI removed dead air and filler pauses to sustain dopamine.
                </p>
              </div>

              {/* Pillar 3: Engagement / Value */}
              <div className="opus-pillar-card">
                <div className="pillar-header-row">
                  <div className="pillar-name">
                    <span className="pillar-icon">💡</span>
                    <strong>Engagement & Payoff</strong>
                  </div>
                  <span className="pillar-score-percent">
                    {activeScoreBreakdownClip.scoreBreakdown?.engagement || 96}%
                  </span>
                </div>
                <div className="pillar-progress-track">
                  <div
                    className="pillar-progress-bar bar-green"
                    style={{ width: `${activeScoreBreakdownClip.scoreBreakdown?.engagement || 96}%` }}
                  />
                </div>
                <p className="pillar-desc">
                  High emotional payoff or actionable nugget that drives 3.4x more comments and shares.
                </p>
              </div>

              {/* Pillar 4: Trend Affinity */}
              <div className="opus-pillar-card">
                <div className="pillar-header-row">
                  <div className="pillar-name">
                    <span className="pillar-icon">📈</span>
                    <strong>YouTube Shorts Trend Affinity</strong>
                  </div>
                  <span className="pillar-score-percent">
                    {activeScoreBreakdownClip.scoreBreakdown?.trend || 94}%
                  </span>
                </div>
                <div className="pillar-progress-track">
                  <div
                    className="pillar-progress-bar bar-orange"
                    style={{ width: `${activeScoreBreakdownClip.scoreBreakdown?.trend || 94}%` }}
                  />
                </div>
                <p className="pillar-desc">
                  Alignment with YouTube Shorts algorithmic recommendation signals and audio pace.
                </p>
              </div>
            </div>

            <div className="opus-checklist-box">
              <span className="checklist-heading">YouTube Shorts Optimization Checklist</span>
              <div className="checklist-grid">
                <div className="check-item"><Check size={14} color="#10b981" /> 9:16 Vertical Framing</div>
                <div className="check-item"><Check size={14} color="#10b981" /> Hook within 0-3 Seconds</div>
                <div className="check-item"><Check size={14} color="#10b981" /> Subtitles in UI Safe Zone</div>
                <div className="check-item"><Check size={14} color="#10b981" /> Duration &lt; 60 Seconds</div>
              </div>
            </div>

            <div className="opus-modal-footer">
              <button
                className="action-pill-btn"
                onClick={() => {
                  handleCopyShortsInfo(activeScoreBreakdownClip);
                  alert("Copied YouTube Shorts title and viral tags!");
                }}
              >
                <Copy size={14} />
                <span>Copy Shorts Tags</span>
              </button>
              <button className="primary-pill-btn" onClick={() => setActiveScoreBreakdownClip(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
