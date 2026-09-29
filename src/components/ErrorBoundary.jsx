import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
    try {
      localStorage.setItem(
        "vizard_last_error",
        JSON.stringify({
          message: error?.message || String(error),
          stack: error?.stack,
          componentStack: errorInfo?.componentStack
        })
      );
    } catch (_) {}
  }

  handleReset = () => {
    localStorage.removeItem("vizard_projects");
    localStorage.removeItem("vizard_exported_clips");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            fontFamily: "Inter, sans-serif",
            padding: 24
          }}
        >
          <div
            style={{
              maxWidth: 600,
              width: "100%",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 16,
              padding: 32,
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#ffffff" }}>
              Something encountered an issue
            </h2>
            <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 20 }}>
              The workspace encountered an unexpected state error. You can view the details below or reload back to safety.
            </p>

            <div
              style={{
                background: "#090d16",
                border: "1px solid #1e293b",
                borderRadius: 8,
                padding: 16,
                fontFamily: "monospace",
                fontSize: 12,
                color: "#ef4444",
                marginBottom: 24,
                maxHeight: 180,
                overflowY: "auto",
                whiteSpace: "pre-wrap"
              }}
            >
              {this.state.error?.toString()}
              {"\n\n"}
              {this.state.errorInfo?.componentStack}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  background: "#6366f1",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  background: "#334155",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Reset Data & Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
