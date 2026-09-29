import React, { useState } from "react";
import {
  FolderPlus,
  Plus,
  LayoutGrid,
  List,
  Search,
  MoreVertical,
  Film,
  Play,
  Folder,
  Trash2,
  Copy,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { formatTime } from "../utils/aiClippingEngine";

export default function ProjectsView({
  projects,
  folders,
  currentFolderId,
  setCurrentFolderId,
  onCreateFolder,
  onOpenProject,
  onDeleteProject,
  onDuplicateProject,
  onNewProjectClick
}) {
  const [activeTab, setActiveTab] = useState("projects"); // projects, videos
  const [viewMode, setViewMode] = useState("grid"); // grid, list
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("modified"); // modified, created, name
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Filter projects by folder and search
  const filteredProjects = projects.filter((p) => {
    const matchesFolder = currentFolderId === "root" || p.folderId === currentFolderId;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  // Sort
  filteredProjects.sort((a, b) => {
    if (sortBy === "name") return a.title.localeCompare(b.title);
    if (sortBy === "created") return new Date(b.createdAt) - new Date(a.createdAt);
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  return (
    <div className="view-scroll-container">
      {/* Top Action Header */}
      <div className="section-header-row" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-main)" }}>
            Projects
          </h1>
          {/* Folder breadcrumbs */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            <span
              style={{ cursor: "pointer", color: currentFolderId === "root" ? "var(--primary)" : undefined }}
              onClick={() => setCurrentFolderId("root")}
            >
              All Projects
            </span>
            {currentFolderId !== "root" && (
              <>
                <ChevronRight size={14} />
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                  {folders.find((f) => f.id === currentFolderId)?.name || "Folder"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="action-pill-btn"
            onClick={() => {
              const name = prompt("Enter new folder name:");
              if (name && name.trim()) {
                onCreateFolder(name.trim());
              }
            }}
          >
            <FolderPlus size={16} color="var(--primary)" />
            <span>New folder</span>
          </button>

          <button className="get-clips-btn" onClick={onNewProjectClick}>
            <Plus size={16} />
            <span>New project</span>
          </button>
        </div>
      </div>

      {/* Folders List Row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {folders.map((f) => (
          <div
            key={f.id}
            onClick={() => setCurrentFolderId(f.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: "var(--radius-md)",
              backgroundColor: currentFolderId === f.id ? "var(--primary-light)" : "var(--bg-surface)",
              border: `1px solid ${currentFolderId === f.id ? "var(--primary)" : "var(--border-color)"}`,
              color: currentFolderId === f.id ? "var(--primary)" : "var(--text-main)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.2s ease"
            }}
          >
            <Folder size={16} />
            <span>{f.name}</span>
          </div>
        ))}
      </div>

      {/* Filter and View Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          gap: 16
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", width: 280 }}>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              background: "var(--bg-surface)",
              color: "var(--text-main)",
              fontSize: 13
            }}
          />
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
          />
        </div>

        {/* Right options */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Sort Menu */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 600
            }}
          >
            <option value="modified">Last modified</option>
            <option value="created">Last created</option>
            <option value="name">Project name</option>
          </select>

          {/* Grid / List Switcher */}
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
              title="Grid View"
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
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Display */}
      {filteredProjects.length === 0 ? (
        <div
          style={{
            padding: 50,
            textAlign: "center",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--border-color)"
          }}
        >
          <Film size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <h3>No projects found</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Create a new project or change folder filter
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="projects-grid">
          {filteredProjects.map((proj) => (
            <div key={proj.id} className="project-card">
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

              <div className="project-card-body">
                <div
                  className="project-title"
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

                  <div className="project-card-actions">
                    <button
                      className="header-icon-btn"
                      style={{ width: 28, height: 28 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === proj.id ? null : proj.id);
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {activeMenuId === proj.id && (
                      <div
                        className="card-menu-dropdown"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className="dropdown-item"
                          onClick={() => {
                            setActiveMenuId(null);
                            onOpenProject(proj);
                          }}
                        >
                          <Film size={14} />
                          <span>Open Studio</span>
                        </div>
                        <div
                          className="dropdown-item"
                          onClick={() => {
                            setActiveMenuId(null);
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
                            setActiveMenuId(null);
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
          {filteredProjects.map((proj, idx) => (
            <div
              key={proj.id}
              onClick={() => onOpenProject(proj)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: idx < filteredProjects.length - 1 ? "1px solid var(--border-color)" : "none",
                cursor: "pointer",
                gap: 16
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 38,
                  borderRadius: 6,
                  overflow: "hidden",
                  background: "#000",
                  flexShrink: 0
                }}
              >
                <img
                  src={proj.thumbnail}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)" }}>
                  {proj.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {proj.formattedDuration || formatTime(proj.duration)} • {proj.clips?.length || 0} clips
                </div>
              </div>

              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}
              </div>

              <button
                className="action-pill-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenProject(proj);
                }}
              >
                Open Studio
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
