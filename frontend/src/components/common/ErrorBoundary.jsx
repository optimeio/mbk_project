"use client";

import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console in dev, silently handle in prod
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            backgroundColor: "#f8f3ed",
            color: "#1f2937",
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: "420px",
              width: "100%",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "clamp(24px, 5vw, 40px)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #fee2e2, #fecaca)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
              }}
            >
              ⚠️
            </div>

            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "clamp(1.1rem, 3vw, 1.35rem)",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Something went wrong
            </h2>

            <p
              style={{
                margin: "0 0 24px",
                fontSize: "0.9rem",
                color: "#6b7280",
                lineHeight: 1.5,
              }}
            >
              An unexpected error occurred. Please try again or go back to the home page.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={this.handleRetry}
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #f97316, #fb923c)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  minHeight: "48px",
                  transition: "transform 150ms ease, box-shadow 150ms ease",
                }}
              >
                Try Again
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  background: "transparent",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  minHeight: "48px",
                }}
              >
                Go to Home Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
