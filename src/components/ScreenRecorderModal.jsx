import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Video,
  Monitor,
  Mic,
  Square,
  Play,
  Check,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { formatTime } from "../utils/aiClippingEngine";

export default function ScreenRecorderModal({ onClose, onRecordingComplete }) {
  const [recordMode, setRecordMode] = useState("screen"); // screen, webcam
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [duration, setDuration] = useState(0);

  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Start media stream based on mode
  const startStream = async (mode) => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      let newStream;
      if (mode === "screen") {
        newStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: true
        });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true
        });
      }

      setStream(newStream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.warn("Could not acquire media stream:", err);
      // Fallback synthetic stream if permissions denied or headless
      alert("Microphone/Camera or Screen permission required. " + err.message);
    }
  };

  useEffect(() => {
    startStream(recordMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordMode]);

  // Start actual recording
  const handleStartRecording = () => {
    if (!stream) {
      alert("Please allow camera/screen access to start recording.");
      return;
    }

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(200);
    setIsRecording(true);
    setDuration(0);

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleUseRecording = () => {
    if (recordedBlob) {
      const file = new File([recordedBlob], `recording-${Date.now()}.webm`, {
        type: "video/webm"
      });
      onRecordingComplete({ source: file, title: `Screen Recording ${new Date().toLocaleTimeString()}` });
      onClose();
    }
  };

  return (
    <div className="studio-modal-backdrop" onClick={onClose}>
      <div
        className="recorder-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="studio-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="record-btn-indicator" />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Record Video & Screen</h3>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`preset-card-btn ${recordMode === "screen" ? "active" : ""}`}
              onClick={() => {
                setRecordMode("screen");
                setRecordedUrl(null);
              }}
            >
              <Monitor size={14} style={{ display: "inline", marginRight: 4 }} />
              Screen
            </button>
            <button
              className={`preset-card-btn ${recordMode === "webcam" ? "active" : ""}`}
              onClick={() => {
                setRecordMode("webcam");
                setRecordedUrl(null);
              }}
            >
              <Video size={14} style={{ display: "inline", marginRight: 4 }} />
              Camera
            </button>
          </div>

          <button className="header-icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Video Stream Preview */}
        <div className="recorder-stream-preview">
          {recordedUrl ? (
            <video
              src={recordedUrl}
              controls
              autoPlay
              className="recorder-video-stream"
            />
          ) : (
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="recorder-video-stream"
            />
          )}

          {/* Recording Timer Badge */}
          {isRecording && (
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                background: "rgba(239, 68, 68, 0.9)",
                color: "white",
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span className="record-btn-indicator" style={{ background: "white" }} />
              <span>REC {formatTime(duration)}</span>
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="recorder-controls-row">
          <div>
            {!recordedUrl ? (
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {isRecording ? "Recording in progress..." : "Ready to record screen or camera"}
              </span>
            ) : (
              <span style={{ fontSize: 13, color: "var(--accent-green)", fontWeight: 600 }}>
                Recording complete ({formatTime(duration)})
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {!recordedUrl ? (
              !isRecording ? (
                <button
                  className="get-clips-btn"
                  onClick={handleStartRecording}
                  style={{ background: "#ef4444" }}
                >
                  <Video size={16} />
                  <span>Start Recording</span>
                </button>
              ) : (
                <button
                  className="get-clips-btn"
                  onClick={handleStopRecording}
                  style={{ background: "#111827" }}
                >
                  <Square size={16} />
                  <span>Stop Recording</span>
                </button>
              )
            ) : (
              <>
                <button
                  className="action-pill-btn"
                  onClick={() => {
                    setRecordedUrl(null);
                    setRecordedBlob(null);
                    startStream(recordMode);
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Record Again</span>
                </button>

                <button
                  className="get-clips-btn"
                  onClick={handleUseRecording}
                >
                  <Sparkles size={16} />
                  <span>Create AI Project</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
