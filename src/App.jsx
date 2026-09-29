import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import HomeView from "./components/HomeView";
import ProjectsView from "./components/ProjectsView";
import ExportedView from "./components/ExportedView";
import BrandKitView from "./components/BrandKitView";
import CalendarView from "./components/CalendarView";
import AnalyticsView from "./components/AnalyticsView";
import VideoStudioModal from "./components/VideoStudioModal";
import ScreenRecorderModal from "./components/ScreenRecorderModal";
import SearchModal from "./components/SearchModal";
import VizardAgentModal from "./components/VizardAgentModal";
import WhatsNewModal from "./components/WhatsNewModal";
import TutorialsModal from "./components/TutorialsModal";
import UpgradeModal from "./components/UpgradeModal";
import AIClipSetupModal from "./components/AIClipSetupModal";
import ProjectClipsView from "./components/ProjectClipsView";
import LiveCreatorRadar from "./components/LiveCreatorRadar";

import {
  INITIAL_PROJECTS,
  INITIAL_FOLDERS,
  INITIAL_EXPORTED_CLIPS,
  INITIAL_BRAND_KIT,
  INITIAL_CALENDAR_EVENTS,
  storage
} from "./utils/constants";
import { processVideoAndExtractClips } from "./utils/aiClippingEngine";
import { Sparkles, Users } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");

  // Persistent Real-Time States (Zero fake or sample data)
  const [projects, setProjects] = useState(() => {
    try {
      const saved = storage.get("projects", []);
      if (!Array.isArray(saved)) return [];
      // Cleanly filter out any legacy sample projects
      return saved.filter(
        (p) =>
          p &&
          p.id &&
          !p.id.includes("proj-extreme") &&
          !p.id.includes("proj-hormozi") &&
          !p.id.includes("proj-ai-founders") &&
          !p.id.includes("proj-steve-jobs") &&
          !String(p.sourceUrl || "").includes("commondatastorage")
      );
    } catch {
      return [];
    }
  });
  const [folders, setFolders] = useState(() =>
    storage.get("folders", INITIAL_FOLDERS)
  );
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [exportedClips, setExportedClips] = useState(() => {
    try {
      const saved = storage.get("exported_clips", []);
      if (!Array.isArray(saved)) return [];
      return saved.filter(
        (c) =>
          c &&
          c.id &&
          !c.id.startsWith("exp-") &&
          !String(c.videoUrl || "").includes("commondatastorage")
      );
    } catch {
      return [];
    }
  });
  const [brandKit, setBrandKit] = useState(() =>
    storage.get("brand_kit", INITIAL_BRAND_KIT)
  );
  const [calendarEvents, setCalendarEvents] = useState(() => {
    try {
      const saved = storage.get("calendar_events", []);
      if (!Array.isArray(saved)) return [];
      return saved.filter((e) => e && e.id && !e.id.startsWith("cal-"));
    } catch {
      return [];
    }
  });

  // Studio & Processing States
  const [activeProjectClips, setActiveProjectClips] = useState(null);
  const [activeStudioProject, setActiveStudioProject] = useState(null);
  const [initialStudioClipId, setInitialStudioClipId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatusText, setProcessingStatusText] = useState("");
  const [setupVideoInfo, setSetupVideoInfo] = useState(null);

  // Modals
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [isTutorialsOpen, setIsTutorialsOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  // Sync state to storage
  useEffect(() => {
    storage.set("projects", projects);
  }, [projects]);

  useEffect(() => {
    storage.set("folders", folders);
  }, [folders]);

  useEffect(() => {
    storage.set("exported_clips", exportedClips);
  }, [exportedClips]);

  useEffect(() => {
    storage.set("brand_kit", brandKit);
  }, [brandKit]);

  useEffect(() => {
    storage.set("calendar_events", calendarEvents);
  }, [calendarEvents]);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Process Video and Extract 15-60s Viral Clips
  const handleStartProcessingVideo = async (source, options = {}) => {
    setIsProcessing(true);
    setProcessingProgress(5);
    setProcessingStatusText("Initializing AI video segmenter...");

    try {
      const result = await processVideoAndExtractClips(
        source,
        options,
        (prog, text) => {
          setProcessingProgress(prog);
          setProcessingStatusText(text);
        }
      );

      const res = result || {};
      const newProject = {
        id: `proj-${Date.now()}`,
        title: res.title || options.title || "New AI Video Project",
        sourceUrl: res.sourceUrl || (typeof source === "string" ? source : res.metadata?.url),
        youtubeId: res.youtubeId,
        videoId: res.videoId || res.metadata?.videoId,
        previewUrl: res.previewUrl || res.metadata?.previewUrl,
        duration: res.duration || 60,
        formattedDuration: res.formattedDuration || "01:00",
        clipsCount: res.clips?.length || 0,
        folderId: currentFolderId,
        thumbnail:
          res.thumbnail ||
          "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "Completed",
        transcript: res.transcript || [],
        clips: res.clips || [],
        metadata: res.metadata || {}
      };

      setProjects((prev) => [newProject, ...prev]);
      setIsProcessing(false);

      // Immediately open the Project Clips Review list view!
      setActiveProjectClips(newProject);
    } catch (err) {
      console.error(err);
      alert("Error analyzing video: " + err.message);
      setIsProcessing(false);
    }
  };

  // Clear and reset workspace cache
  const handleResetData = () => {
    localStorage.clear();
    setProjects(INITIAL_PROJECTS);
    setFolders(INITIAL_FOLDERS);
    setExportedClips(INITIAL_EXPORTED_CLIPS);
    setBrandKit(INITIAL_BRAND_KIT);
    setCalendarEvents(INITIAL_CALENDAR_EVENTS);
    setCurrentFolderId("root");
    setActiveTab("home");
  };

  // Handlers for Project actions
  const handleDeleteProject = (id) => {
    if (confirm("Are you sure you want to delete this project?")) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleDuplicateProject = (projectToDup) => {
    const duplicated = {
      ...projectToDup,
      id: `proj-${Date.now()}`,
      title: `${projectToDup.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setProjects((prev) => [duplicated, ...prev]);
  };

  const handleCreateFolder = (name) => {
    const newFolder = {
      id: `folder-${Date.now()}`,
      name: name
    };
    setFolders((prev) => [...prev, newFolder]);
    setCurrentFolderId(newFolder.id);
  };

  const handleSaveExportedClip = (clip) => {
    setExportedClips((prev) => [clip, ...prev]);
  };

  const handleScheduleClip = (scheduleData) => {
    if (!scheduleData) return;
    setCalendarEvents((prev) => [
      {
        id: `event-${Date.now()}`,
        title: scheduleData.title || "Scheduled Clip Post",
        date: scheduleData.date || new Date().toISOString().split("T")[0],
        time: scheduleData.time || "10:00 AM",
        platform: scheduleData.platform || "YouTube Shorts",
        status: "Scheduled"
      },
      ...(prev || [])
    ]);
  };

  const handleDeleteExportedClip = (id) => {
    if (confirm("Delete this exported clip?")) {
      setExportedClips((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleAddCalendarEvent = (evt) => {
    setCalendarEvents((prev) => [...prev, evt]);
  };

  const handleDeleteCalendarEvent = (id) => {
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleUpdateProject = (updatedProj) => {
    if (!updatedProj || !updatedProj.id) return;
    setActiveProjectClips(updatedProj);
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProj.id ? updatedProj : p))
    );
  };

  return (
    <div className="vizard-app-container">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        exportedCount={exportedClips.length}
        onOpenAgent={() => setIsAgentOpen(true)}
        onOpenWhatsNew={() => setIsWhatsNewOpen(true)}
        onOpenTutorials={() => setIsTutorialsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="vizard-main-content">
        <Header
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenUpgrade={() => setIsUpgradeOpen(true)}
          onResetData={handleResetData}
        />

        {/* View Switcher */}
        {activeTab === "home" && (
          <HomeView
            projects={projects}
            onOpenSetupModal={(videoInfo) => setSetupVideoInfo(videoInfo)}
            onOpenProject={(proj) => {
              setActiveProjectClips(proj);
            }}
            onOpenRecorder={() => setIsRecorderOpen(true)}
            onOpenAgent={() => setIsAgentOpen(true)}
            onDeleteProject={handleDeleteProject}
            onDuplicateProject={handleDuplicateProject}
            onFastShortsClip={(creatorData) => {
              handleStartProcessingVideo(creatorData.source, {
                durationRange: "30-60",
                clipCount: 4,
                aiFocus: "hooks",
                subtitleStyle: "hormozi",
                aspectRatio: "9:16",
                isYouTubeShorts: true,
                title: creatorData.title || `${creatorData.creator} - Viral Shorts`,
                creator: creatorData.creator,
                platform: creatorData.platform
              });
            }}
          />
        )}

        {activeTab === "radar" && (
          <div className="view-scroll-container">
            <LiveCreatorRadar
              onFastShortsClip={(creatorData) => {
                handleStartProcessingVideo(creatorData.source, {
                  durationRange: "30-60",
                  clipCount: 4,
                  aiFocus: "hooks",
                  subtitleStyle: "hormozi",
                  aspectRatio: "9:16",
                  isYouTubeShorts: true,
                  title: creatorData.title || `${creatorData.creator} - Viral Shorts`,
                  creator: creatorData.creator,
                  platform: creatorData.platform
                });
              }}
              onOpenSetupModal={(videoInfo) => setSetupVideoInfo(videoInfo)}
            />
          </div>
        )}

        {activeTab === "projects" && (
          <ProjectsView
            projects={projects}
            folders={folders}
            currentFolderId={currentFolderId}
            setCurrentFolderId={setCurrentFolderId}
            onCreateFolder={handleCreateFolder}
            onOpenProject={(proj) => {
              setActiveProjectClips(proj);
            }}
            onDeleteProject={handleDeleteProject}
            onDuplicateProject={handleDuplicateProject}
            onNewProjectClick={() => setActiveTab("home")}
          />
        )}

        {activeTab === "exported" && (
          <ExportedView
            exportedClips={exportedClips}
            onDeleteExportedClip={handleDeleteExportedClip}
            onScheduleClip={(data) => {
              handleAddCalendarEvent({
                id: `cal-${Date.now()}`,
                title: data.title,
                platform: data.platform,
                date: data.date,
                time: data.time,
                clipId: data.clipId,
                status: "Scheduled"
              });
            }}
          />
        )}

        {activeTab === "brand" && (
          <BrandKitView
            brandKit={brandKit}
            onUpdateBrandKit={(kit) => setBrandKit(kit)}
          />
        )}

        {activeTab === "calendar" && (
          <CalendarView
            events={calendarEvents}
            onAddEvent={handleAddCalendarEvent}
            onDeleteEvent={handleDeleteCalendarEvent}
            exportedClips={exportedClips}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsView exportedClips={exportedClips} />
        )}

        {activeTab === "shared" && (
          <div className="view-scroll-container" style={{ textAlign: "center", padding: "80px 20px" }}>
            <Users size={48} color="var(--primary)" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
              Shared with Me
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto 20px" }}>
              Collaborate in real time! Any video projects or clip drafts shared by your team members will appear here.
            </p>
            <button
              className="action-pill-btn"
              style={{ margin: "0 auto" }}
              onClick={() => alert("Invite link copied to clipboard!")}
            >
              Share Workspace Link
            </button>
          </div>
        )}
      </main>

      {/* AI Clip Duration & Options Setup Modal */}
      {setupVideoInfo && (
        <AIClipSetupModal
          isOpen={Boolean(setupVideoInfo)}
          onClose={() => setSetupVideoInfo(null)}
          videoSource={setupVideoInfo.source}
          videoTitle={setupVideoInfo.title}
          videoThumbnail={setupVideoInfo.thumbnail}
          onConfirmGenerate={(options) => {
            handleStartProcessingVideo(setupVideoInfo.source, {
              title: setupVideoInfo.title,
              ...options
            });
            setSetupVideoInfo(null);
          }}
        />
      )}

      {/* AI Video Processing In-Progress Modal */}
      {isProcessing && (
        <div className="studio-modal-backdrop">
          <div className="export-progress-modal">
            <Sparkles size={40} color="var(--primary)" className="pulse" />
            <h3 style={{ fontSize: 20, fontWeight: 800 }}>Analyzing Video with AI</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {processingStatusText}
            </p>

            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${processingProgress}%` }}
              />
            </div>

            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              {processingProgress}%
            </span>
          </div>
        </div>
      )}

      {/* Full Video Studio Modal */}
      {activeStudioProject && (
        <VideoStudioModal
          project={activeStudioProject}
          initialClipId={initialStudioClipId}
          brandKit={brandKit}
          onClose={() => setActiveStudioProject(null)}
          onSaveExportedClip={handleSaveExportedClip}
        />
      )}

      {/* Screen & Webcam Recorder Modal */}
      {isRecorderOpen && (
        <ScreenRecorderModal
          onClose={() => setIsRecorderOpen(false)}
          onRecordingComplete={(rec) =>
            setSetupVideoInfo({ source: rec.source, title: rec.title, thumbnail: "" })
          }
        />
      )}

      {/* Spotlight Search Modal (Cmd+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        projects={projects}
        onOpenProject={(proj) => {
          setActiveProjectClips(proj);
        }}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Vizard Agent Modal */}
      <VizardAgentModal
        isOpen={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
        onGenerateWithAgent={(agentData) =>
          handleStartProcessingVideo(agentData.source, {
            title: agentData.title,
            customPrompt: agentData.prompt,
            durationRange: "15-60",
            clipCount: 4
          })
        }
      />

      {/* What's New Modal */}
      <WhatsNewModal
        isOpen={isWhatsNewOpen}
        onClose={() => setIsWhatsNewOpen(false)}
      />

      {/* Tutorials Modal */}
      <TutorialsModal
        isOpen={isTutorialsOpen}
        onClose={() => setIsTutorialsOpen(false)}
      />

      {/* Upgrade / Pricing Modal */}
      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />

      {/* Vizard Project Clips Review Page (Exact Replica of /project/<id>) */}
      {activeProjectClips && (
        <ProjectClipsView
          project={activeProjectClips}
          onBack={() => setActiveProjectClips(null)}
          onOpenStudio={(proj, clipId) => {
            setActiveStudioProject(proj);
            setInitialStudioClipId(clipId);
          }}
          onScheduleClip={handleScheduleClip}
          onSaveExportedClip={handleSaveExportedClip}
          onUpdateProject={handleUpdateProject}
          onOpenUpgrade={() => setIsUpgradeOpen(true)}
        />
      )}
    </div>
  );
}
