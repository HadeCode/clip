import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  ChevronLeft,
  ChevronRight,
  Share2,
  Trash2
} from "lucide-react";

export default function CalendarView({ events = [], onAddEvent, onDeleteEvent, exportedClips = [] }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const [currentMonth, setCurrentMonth] = useState(`${monthNames[now.getMonth()]} ${currentYear}`);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Generate 35 days calendar grid with real current dates
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = Array.from({ length: 35 }, (_, i) => {
    const dayNum = (i % 31) + 1;
    const dateStr = `${currentYear}-${currentMonthNum.toString().padStart(2, "0")}-${dayNum.toString().padStart(2, "0")}`;
    const dayEvents = (events || []).filter(
      (e) => e.date === dateStr || e.date?.endsWith(`-${dayNum.toString().padStart(2, "0")}`)
    );
    return {
      dayNum,
      dateStr,
      events: dayEvents
    };
  });

  const platformColors = {
    TikTok: "#ff0050",
    "YouTube Shorts": "#ff0000",
    "Instagram Reels": "#e1306c",
    LinkedIn: "#0a66c2"
  };

  const todayDateNum = now.getDate();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostPlatform, setNewPostPlatform] = useState("YouTube Shorts");
  const [newPostDate, setNewPostDate] = useState(now.toISOString().split("T")[0]);
  const [newPostTime, setNewPostTime] = useState("12:00 PM");

  const handleOpenSchedule = (initialDate = null) => {
    if (initialDate) {
      setNewPostDate(initialDate);
    }
    if (exportedClips.length > 0 && !newPostTitle) {
      setNewPostTitle(exportedClips[0].title);
    }
    setScheduleModalOpen(true);
  };

  const handleSavePost = () => {
    if (!newPostTitle.trim()) {
      alert("Please provide a title for the post.");
      return;
    }
    onAddEvent({
      id: `cal-${Date.now()}`,
      title: newPostTitle.trim(),
      platform: newPostPlatform,
      date: newPostDate,
      time: newPostTime,
      status: "Scheduled"
    });
    setScheduleModalOpen(false);
    setNewPostTitle("");
  };

  return (
    <div className="view-scroll-container">
      {/* Header */}
      <div className="section-header-row" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-main)" }}>
            Content Calendar
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Schedule and automate your viral short-form distribution across platforms
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{currentMonth}</span>
          </div>

          <button
            className="get-clips-btn"
            onClick={() => handleOpenSchedule()}
          >
            <Plus size={16} />
            <span>Schedule Post</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid Table */}
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-color)",
          overflow: "hidden"
        }}
      >
        {/* Days of week header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-surface-secondary)"
          }}
        >
          {daysOfWeek.map((day) => (
            <div
              key={day}
              style={{
                padding: "12px 14px",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-secondary)",
                textAlign: "center"
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days cells */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridAutoRows: "minmax(110px, auto)"
          }}
        >
          {days.map((cell, idx) => {
            const isToday = cell.dayNum === todayDateNum;
            return (
              <div
                key={idx}
                onClick={() => handleOpenSchedule(cell.dateStr)}
                style={{
                  borderRight: (idx + 1) % 7 === 0 ? "none" : "1px solid var(--border-color)",
                  borderBottom: idx >= 28 ? "none" : "1px solid var(--border-color)",
                  padding: 8,
                  position: "relative",
                  background: isToday ? "rgba(108, 92, 231, 0.08)" : "transparent",
                  cursor: "pointer"
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: isToday ? 800 : 600,
                    color: isToday ? "var(--primary)" : "var(--text-muted)",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <span>{cell.dayNum}</span>
                  {isToday && (
                    <span style={{ fontSize: 9, background: "var(--primary)", color: "white", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                      TODAY
                    </span>
                  )}
                </div>

                {/* Events in cell */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {cell.events.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(evt);
                      }}
                      style={{
                        padding: "4px 6px",
                        borderRadius: 4,
                        background: "var(--bg-surface-secondary)",
                        borderLeft: `3px solid ${platformColors[evt.platform] || "var(--primary)"}`,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                      title={`${evt.platform}: ${evt.title} (${evt.time})`}
                    >
                      <span>{evt.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Post Modal */}
      {scheduleModalOpen && (
        <div className="studio-modal-backdrop" onClick={() => setScheduleModalOpen(false)}>
          <div
            className="export-progress-modal"
            style={{ width: 440, textAlign: "left", alignItems: "stretch" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <CalendarIcon size={24} color="var(--primary)" />
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Schedule Post</h3>
            </div>

            {exportedClips.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label className="setting-label">Select from your exported clips:</label>
                <select
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 6,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-surface-secondary)",
                    marginTop: 6
                  }}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                >
                  <option value="">-- Choose an exported clip --</option>
                  {exportedClips.map((c) => (
                    <option key={c.id} value={c.title}>
                      {c.title} ({c.duration}s)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label className="setting-label">Post Title or Hook</label>
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="e.g. Kai Cenat crazy reaction clip #Shorts"
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

            <div style={{ marginBottom: 12 }}>
              <label className="setting-label">Platform</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 6 }}>
                {["YouTube Shorts", "TikTok", "Instagram Reels", "LinkedIn"].map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    className={`preset-card-btn ${newPostPlatform === plat ? "active" : ""}`}
                    onClick={() => setNewPostPlatform(plat)}
                  >
                    {plat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label className="setting-label">Date</label>
                <input
                  type="date"
                  value={newPostDate}
                  onChange={(e) => setNewPostDate(e.target.value)}
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
              <div style={{ flex: 1 }}>
                <label className="setting-label">Time</label>
                <input
                  type="text"
                  value={newPostTime}
                  onChange={(e) => setNewPostTime(e.target.value)}
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

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="get-clips-btn"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={handleSavePost}
              >
                Schedule Post
              </button>
              <button
                className="action-pill-btn"
                onClick={() => setScheduleModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Event Details Dialog */}
      {selectedEvent && (
        <div className="studio-modal-backdrop" onClick={() => setSelectedEvent(null)}>
          <div
            className="export-progress-modal"
            style={{ width: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <CalendarIcon size={32} color="var(--primary)" />
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>{selectedEvent.title}</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Platform: <strong>{selectedEvent.platform}</strong> • Time: <strong>{selectedEvent.time}</strong>
            </p>

            <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 12 }}>
              <button
                className="action-pill-btn"
                style={{ color: "#ef4444", flex: 1, justifyContent: "center" }}
                onClick={() => {
                  onDeleteEvent(selectedEvent.id);
                  setSelectedEvent(null);
                }}
              >
                <Trash2 size={14} />
                <span>Remove Post</span>
              </button>

              <button
                className="action-pill-btn"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
