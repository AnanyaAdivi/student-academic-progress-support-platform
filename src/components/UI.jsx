import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AlertCircle, CheckCircle2, Info, LoaderCircle, } from "lucide-react";
export function PageHeading({ title, subtitle, action, }) {
    return (_jsxs("div", { className: "page-heading", children: [_jsxs("div", { children: [_jsx("h1", { children: title }), _jsx("p", { children: subtitle })] }), action] }));
}
export function Card({ children, className = "", }) {
    return _jsx("section", { className: `panel ${className}`, children: children });
}
export function Stat({ label, value, note, icon: Icon, tone = "green", onClick, }) {
    const content = (_jsxs(_Fragment, { children: [_jsxs("div", { className: "stat-top", children: [_jsx("span", { children: label }), _jsx("span", { className: `stat-icon ${tone}`, children: _jsx(Icon, { size: 17 }) })] }), _jsx("strong", { children: value }), _jsx("small", { children: note })] }));
    if (onClick) {
        return (_jsx("button", { type: "button", className: "stat-card stat-card-interactive", onClick: onClick, "aria-label": `${label}: ${value}. Open details`, children: content }));
    }
    return _jsx("div", { className: "stat-card", children: content });
}
export function Status({ status }) {
    // Use RegExp.replace rather than String.replaceAll for older TS targets.
    const cls = status.toLowerCase().replace(/_/g, "-");
    const label = status
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) => character.toUpperCase());
    return _jsx("span", { className: `status ${cls}`, children: label });
}
export function EmptyState({ title, text, action, }) {
    return (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: _jsx(Info, { size: 21 }) }), _jsx("h3", { children: title }), _jsx("p", { children: text }), action] }));
}
export function Notice({ kind = "info", children, }) {
    const Icon = kind === "error"
        ? AlertCircle
        : kind === "success"
            ? CheckCircle2
            : Info;
    return (_jsxs("div", { className: `notice ${kind}`, children: [_jsx(Icon, { size: 16 }), _jsx("span", { children: children })] }));
}
export function Spinner({ label = "Loading…" }) {
    return (_jsxs("div", { className: "spinner-line", children: [_jsx(LoaderCircle, { size: 17, className: "spin" }), label] }));
}
export function Modal({ title, children, onClose, }) {
    return (_jsx("div", { className: "modal-backdrop", role: "presentation", onMouseDown: (event) => {
            if (event.target === event.currentTarget)
                onClose();
        }, children: _jsxs("div", { className: "modal", role: "dialog", "aria-modal": "true", "aria-label": title, children: [_jsxs("div", { className: "modal-head", children: [_jsx("h2", { children: title }), _jsx("button", { type: "button", className: "close-button", onClick: onClose, "aria-label": "Close dialog", children: "\u00D7" })] }), children] }) }));
}
