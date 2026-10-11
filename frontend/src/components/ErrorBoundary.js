import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UI crashed:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", fontFamily: "sans-serif", background: "#FDFBF7" }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: "#5C5C5C", maxWidth: 360 }}>
          Please reload the page. If it keeps happening, open this link in Safari or Chrome.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 20, padding: "12px 28px", borderRadius: 999, border: 0, background: "#C5A059", color: "#fff", fontSize: 16 }}
        >
          Reload
        </button>
        <pre style={{ marginTop: 20, fontSize: 11, color: "#999", whiteSpace: "pre-wrap", maxWidth: 360 }}>
          {String((this.state.error && this.state.error.message) || this.state.error)}
        </pre>
      </div>
    );
  }
}