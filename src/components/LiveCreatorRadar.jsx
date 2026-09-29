import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Radio,
  Flame,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  Zap,
  Play,
  Tv,
  TrendingUp,
  Clock,
  Eye,
  SlidersHorizontal,
  Wifi,
  Users
} from "lucide-react";

// Platform icons & badges
function PlatformIcon({ platform, size = 14 }) {
  if (platform === "twitch") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#a970ff">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
      </svg>
    );
  }
  if (platform === "youtube") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#ff0000">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    );
  }
  return <Tv size={size} color="var(--accent-green)" />;
}

export default function LiveCreatorRadar({
  onFastShortsClip,
  onOpenSetupModal
}) {
  const [creators, setCreators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'live' | 'twitch' | 'youtube'
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(Date.now());
  const [countdown, setCountdown] = useState(15);
  const [clippingId, setClippingId] = useState(null);
  const timerRef = useRef(null);

  // Fetch live streamer & creator feed in real-time from server
  const fetchLiveRadar = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch(`http://127.0.0.1:5001/api/creators/live${manual ? "?refresh=1" : ""}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.creators)) {
          setCreators(data.creators);
          setLastRefreshedAt(Date.now());
          setCountdown(15);
        }
      }
    } catch (err) {
      console.warn("Live radar connection error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveRadar(false);

    // Active real-time 15s poll
    const pollInterval = setInterval(() => {
      fetchLiveRadar(false);
    }, 15000);

    // 1-second countdown ticker for transparent real-time syncing
    timerRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 15 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Filtered and searched creators
  const filteredCreators = useMemo(() => {
    let list = creators;

    if (activeFilter === "live") {
      list = list.filter((c) => c.isLive);
    } else if (activeFilter === "twitch") {
      list = list.filter((c) => c.platform === "twitch");
    } else if (activeFilter === "youtube") {
      list = list.filter((c) => c.platform === "youtube");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.creator.toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q) ||
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.category && c.category.toLowerCase().includes(q))
      );
    }

    return list;
  }, [creators, activeFilter, searchQuery]);

  // Real-time live counts and total live viewers
  const totalLive = useMemo(() => creators.filter((c) => c.isLive).length, [creators]);
  const totalLiveViewers = useMemo(
    () => creators.filter((c) => c.isLive).reduce((acc, c) => acc + (c.viewersCount || 0), 0),
    [creators]
  );

  // 1-Click Fast Shorts Clip Trigger
  const handleTriggerShortsClip = (creatorItem) => {
    setClippingId(creatorItem.id);
    onFastShortsClip?.({
      source: creatorItem.url,
      title: `${creatorItem.creator} - ${creatorItem.title || "Stream Moment"}`,
      thumbnail: creatorItem.thumbnail || creatorItem.avatar,
      creator: creatorItem.creator,
      platform: creatorItem.platform,
      isLive: creatorItem.isLive
    });
    setTimeout(() => setClippingId(null), 1200);
  };

  return (
    <section className="live-creator-radar-section">
      {/* Top Banner Header */}
      <div className="radar-header-row">
        <div className="radar-title-cluster">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="radar-live-badge-glow">
              <span className="live-dot-pulse" />
              <Radio size={14} className="radar-radio-icon" />
              <span className="live-badge-text">LIVE REAL-TIME RADAR</span>
            </div>

            <span className="live-sync-badge">
              <Wifi size={12} color="#10b981" />
              <span>Real-Time Sync in {countdown}s</span>
            </span>
          </div>

          <h2 className="radar-main-heading">
            Live Streamers & Trending Creators{" "}
            <span className="live-counter-pill">
              <span className="live-pill-dot" /> {totalLive} Broadcasting Live Now
            </span>
            {totalLiveViewers > 0 && (
              <span className="live-viewers-aggregate-pill">
                <Users size={12} /> {totalLiveViewers.toLocaleString()} Live Viewers
              </span>
            )}
          </h2>

          <p className="radar-subtext">
            100% authentic, real-time data from English creators on Twitch & YouTube. Clip active broadcasts or brand-new uploads into <strong>YouTube Shorts</strong> with 1 click.
          </p>
        </div>

        <div className="radar-controls-cluster">
          <button
            className={`radar-refresh-btn ${isRefreshing ? "is-loading" : ""}`}
            onClick={() => fetchLiveRadar(true)}
            title="Force refresh live viewer counts and streams right now"
          >
            <RefreshCw size={14} className={isRefreshing ? "spin-icon" : ""} />
            <span>{isRefreshing ? "Syncing..." : "Sync Live Now"}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="radar-filter-bar">
        <div className="radar-tabs-group">
          <button
            className={`radar-tab-btn ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            <Flame size={14} />
            <span>All Trending ({creators.length})</span>
          </button>

          <button
            className={`radar-tab-btn ${activeFilter === "live" ? "active" : ""}`}
            onClick={() => setActiveFilter("live")}
          >
            <span className="live-tab-dot" />
            <span>Live Now ({totalLive})</span>
          </button>

          <button
            className={`radar-tab-btn ${activeFilter === "twitch" ? "active" : ""}`}
            onClick={() => setActiveFilter("twitch")}
          >
            <PlatformIcon platform="twitch" size={13} />
            <span>Twitch</span>
          </button>

          <button
            className={`radar-tab-btn ${activeFilter === "youtube" ? "active" : ""}`}
            onClick={() => setActiveFilter("youtube")}
          >
            <PlatformIcon platform="youtube" size={13} />
            <span>YouTube</span>
          </button>
        </div>

        {/* Creator Search Input */}
        <div className="radar-search-container">
          <Search size={14} className="radar-search-icon" />
          <input
            type="text"
            className="radar-search-input"
            placeholder="Search streamer (e.g. Kai Cenat, Speed, xQc, CaseOh, MKBHD)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="radar-clear-search-btn"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Live Loading Radar Scanner Animation */}
      {isLoading && creators.length === 0 ? (
        <div className="radar-scanning-container">
          <div className="radar-sweep-orb" />
          <Radio size={36} color="#ff0055" className="spin-icon" style={{ animationDuration: "3s" }} />
          <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 14 }}>
            Connecting to Live Twitch & YouTube Feeds...
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Scanning real-time viewer counts, active livestreams, and fresh uploads across English creators.
          </p>
        </div>
      ) : (
        /* Grid of Creator Cards */
        <div className="radar-creators-grid">
          {filteredCreators.length === 0 ? (
            <div className="radar-empty-state">
              <Radio size={32} color="var(--text-muted)" />
              <p>No live creators match "{searchQuery || activeFilter}".</p>
              <button
                className="action-pill-btn"
                onClick={() => {
                  setActiveFilter("all");
                  setSearchQuery("");
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredCreators.map((item, index) => {
              const isClippingThis = clippingId === item.id;
              return (
                <div
                  key={item.id || index}
                  className={`radar-creator-card ${item.isLive ? "is-live-card" : ""}`}
                >
                  {/* Card Top Header: Avatar + Creator Info + Rank */}
                  <div className="creator-card-top">
                    <div className="creator-avatar-wrap">
                      <img
                        src={item.avatar}
                        alt={item.creator}
                        className="creator-avatar-img"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                        }}
                      />
                      <div className={`platform-badge-dot ${item.platform}`}>
                        <PlatformIcon platform={item.platform} size={10} />
                      </div>
                    </div>

                    <div className="creator-meta-text">
                      <div className="creator-name-row">
                        <span className="creator-display-name">{item.creator}</span>
                        {item.isLive && (
                          <span className="badge-live-pill">
                            <span className="red-pulse" /> LIVE
                          </span>
                        )}
                      </div>
                      <span className="creator-handle-tag">{item.handle}</span>
                    </div>

                    {/* Rank / Viewer Count Badge */}
                    <div className="creator-popularity-badge">
                      {item.isLive ? (
                        <div className="live-viewers-box">
                          <Eye size={12} />
                          <span>{item.viewersCount ? Number(item.viewersCount).toLocaleString() : "Live"}</span>
                        </div>
                      ) : (
                        <div className="vod-views-box">
                          <TrendingUp size={11} />
                          <span>{item.viewersCount ? `${(item.viewersCount / 1000).toFixed(0)}k views` : "Recent"}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stream / Video Preview Banner */}
                  <div
                    className="creator-stream-preview-wrapper"
                    onClick={() => handleTriggerShortsClip(item)}
                    title="Click to auto-clip into YouTube Shorts"
                  >
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="stream-preview-thumb"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80";
                        }}
                      />
                    ) : (
                      <div className="stream-preview-placeholder">
                        <PlatformIcon platform={item.platform} size={28} />
                      </div>
                    )}

                    {/* Category Pill Tag */}
                    <div className="stream-category-tag">
                      {item.category || (item.platform === "twitch" ? "Stream" : "Video")}
                    </div>

                    {/* Hover Overlay Play Icon */}
                    <div className="preview-hover-overlay">
                      <div className="overlay-zap-badge">
                        <Zap size={16} fill="currentColor" />
                        <span>1-Click Clip</span>
                      </div>
                    </div>
                  </div>

                  {/* Title & Status Row */}
                  <div className="creator-card-body">
                    <h4 className="stream-title-text" title={item.title}>
                      {item.title || "Live Broadcast"}
                    </h4>
                    <div className="stream-status-caption">
                      <span>{item.statusText}</span>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="creator-card-actions">
                    {/* Primary 1-Click YouTube Shorts Button */}
                    <button
                      className="btn-one-click-shorts"
                      onClick={() => handleTriggerShortsClip(item)}
                      disabled={isClippingThis}
                      title="1-Click: AI pulls footage, crops to 9:16 vertical, adds Hormozi captions & generates YouTube Shorts"
                    >
                      <Zap size={15} fill="currentColor" />
                      <span>{isClippingThis ? "Clipping..." : "⚡ Clip into Shorts"}</span>
                    </button>

                    {/* Studio Setup Link */}
                    <button
                      className="btn-custom-clip-setup"
                      onClick={() =>
                        onOpenSetupModal?.({
                          source: item.url,
                          title: `${item.creator} - ${item.title}`,
                          thumbnail: item.thumbnail || item.avatar,
                          creator: item.creator
                        })
                      }
                      title="Customize clip duration, AI prompt, or subtitle styles"
                    >
                      <SlidersHorizontal size={14} />
                    </button>

                    {/* Direct Platform Link */}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-open-stream-link"
                      title={`Watch original stream on ${item.platform.toUpperCase()}`}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
