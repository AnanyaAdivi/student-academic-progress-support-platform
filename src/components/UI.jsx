import {
  AlertCircle,
  CheckCircle2,
  Info,
  LoaderCircle,
} from "lucide-react";

/* -----------------------------------------
   PAGE HEADING
------------------------------------------ */

export function PageHeading({ title, subtitle, action }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

/* -----------------------------------------
   CARD
------------------------------------------ */

export function Card({ children, className = "" }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

/* -----------------------------------------
   STAT CARD
------------------------------------------ */

export function Stat({
  label,
  value,
  note,
  icon: Icon,
  tone = "green",
  onClick,
}) {
  const content = (
    <>
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>
          <Icon size={17} />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="stat-card stat-card-interactive"
        onClick={onClick}
        aria-label={`${label}: ${value}. Open details`}
      >
        {content}
      </button>
    );
  }

  return <div className="stat-card">{content}</div>;
}

/* -----------------------------------------
   STATUS BADGE
------------------------------------------ */

export function Status({ status }) {
  // Use RegExp.replace rather than String.replaceAll for older TS targets.
  const cls = status.toLowerCase().replace(/_/g, "-");

  const label = status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

  return <span className={`status ${cls}`}>{label}</span>;
}

/* -----------------------------------------
   EMPTY STATE
------------------------------------------ */

export function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Info size={21} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

/* -----------------------------------------
   NOTICE
------------------------------------------ */

export function Notice({ kind = "info", children }) {
  const Icon =
    kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Info;

  return (
    <div className={`notice ${kind}`}>
      <Icon size={16} />
      <span>{children}</span>
    </div>
  );
}

/* -----------------------------------------
   SPINNER
------------------------------------------ */

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="spinner-line">
      <LoaderCircle size={17} className="spin" />
      {label}
    </div>
  );
}

/* -----------------------------------------
   MODAL
------------------------------------------ */

export function Modal({ title, children, onClose }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}