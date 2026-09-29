// Real-time data and configuration for Vizard AI Workspace
// Clean zero-fake-data default state

export const INITIAL_PROJECTS = [];

export const INITIAL_FOLDERS = [
  { id: "root", name: "All Projects" },
  { id: "podcasts", name: "Podcasts & Interviews" },
  { id: "shorts", name: "YouTube Shorts & Reels" },
  { id: "streams", name: "Live Stream Highlights" }
];

export const INITIAL_EXPORTED_CLIPS = [];

export const INITIAL_BRAND_KIT = {
  brandName: "My Creator Studio",
  colors: {
    primary: "#6c5ce7",
    secondary: "#ff5e7e",
    accent: "#ffd166",
    background: "#0f172a"
  },
  logo: {
    url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%236C5CE7'/><polygon points='35,25 75,50 35,75' fill='white'/></svg>",
    name: "Brand Logo",
    position: "top-right",
    opacity: 0.9,
    size: 55
  },
  subtitles: {
    fontFamily: "Plus Jakarta Sans",
    fontSize: 26,
    activeColor: "#FFDD00",
    textColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    hasBackgroundBox: true,
    position: "bottom",
    uppercase: true,
    preset: "hormozi"
  },
  showProgressBar: true,
  progressBarColor: "#ff007a",
  watermarkEnabled: false
};

export const INITIAL_CALENDAR_EVENTS = [];

export const SUBTITLE_PRESETS = [
  {
    id: "hormozi",
    name: "Hormozi Pop",
    fontFamily: "Plus Jakarta Sans",
    activeColor: "#FFDD00",
    textColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 4,
    hasBackgroundBox: true,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    uppercase: true,
    animation: "pop"
  },
  {
    id: "bold",
    name: "Modern Bold",
    fontFamily: "Inter",
    activeColor: "#00F5D4",
    textColor: "#FFFFFF",
    strokeColor: "#111827",
    strokeWidth: 3,
    hasBackgroundBox: false,
    backgroundColor: "transparent",
    uppercase: false,
    animation: "bounce"
  },
  {
    id: "neon",
    name: "Neon Glow",
    fontFamily: "JetBrains Mono",
    activeColor: "#FF007F",
    textColor: "#E2E8F0",
    strokeColor: "#00F0FF",
    strokeWidth: 2,
    hasBackgroundBox: true,
    backgroundColor: "rgba(10, 10, 20, 0.8)",
    uppercase: true,
    animation: "glow"
  },
  {
    id: "clean",
    name: "Clean Minimal",
    fontFamily: "Inter",
    activeColor: "#6C5CE7",
    textColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 1,
    hasBackgroundBox: true,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    uppercase: false,
    animation: "fade"
  },
  {
    id: "impact",
    name: "Red Alert",
    fontFamily: "Plus Jakarta Sans",
    activeColor: "#FF3366",
    textColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 4,
    hasBackgroundBox: true,
    backgroundColor: "rgba(255, 51, 102, 0.2)",
    uppercase: true,
    animation: "scale"
  }
];

export const AGENT_ROTATING_PROMPTS = [
  "Clip the top live English streamer right now into viral YouTube Shorts.",
  "Cut this stream into high-energy moments with Hormozi captions.",
  "Turn this Twitch broadcast into 9:16 Shorts with hook headlines.",
  "Extract the funniest reaction from this live stream.",
  "Generate 4 viral clips from today's upload with animated subtitles."
];

// Helper to save and load state from localStorage with fallback
export const storage = {
  get: (key, defaultValue) => {
    try {
      const item = localStorage.getItem(`vizard_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(`vizard_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage save error", e);
    }
  }
};
