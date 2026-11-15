import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from "react";
export default class ErrorBoundary extends Component {
    constructor() {
        super(...arguments);
        this.state = { hasError: false, message: "" };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, message: error.message || "Unexpected interface error." };
    }
    componentDidCatch(error, info) {
        console.error("Student portal render error:", error, info.componentStack);
    }
    render() {
        if (this.state.hasError) {
            return _jsx("main", { style: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f4f7f5", fontFamily: "sans-serif", color: "#1d3732" }, children: _jsxs("section", { style: { maxWidth: 520, background: "#fff", border: "1px solid #e3ebe6", borderRadius: 14, padding: 28 }, children: [_jsx("h1", { style: { fontSize: 21, marginTop: 0 }, children: "The portal could not load this page" }), _jsx("p", { style: { color: "#73827b", lineHeight: 1.6 }, children: "A frontend error interrupted rendering. Refresh the page. If it continues, open the browser console and share the first red error." }), _jsx("pre", { style: { whiteSpace: "pre-wrap", fontSize: 12, color: "#a45b4f", background: "#fff3f0", padding: 12, borderRadius: 8 }, children: this.state.message }), _jsx("button", { onClick: () => window.location.reload(), style: { background: "#176b57", color: "#fff", border: 0, borderRadius: 7, padding: "10px 15px", cursor: "pointer" }, children: "Refresh portal" })] }) });
        }
        return this.props.children;
    }
}
