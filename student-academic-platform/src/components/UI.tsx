import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";

export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
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

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function Stat({
  label,
  value,
  note,
  icon: Icon,
  tone = "green",
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: string;
  onClick?: () => void;
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

export function Status({ status }: { status: string }) {
  // Use RegExp.replace rather than String.replaceAll for older TS targets.
  const cls = status.toLowerCase().replace(/_/g, "-");
  const label = status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

  return <span className={`status ${cls}`}>{label}</span>;
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
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

export function Notice({
  kind = "info",
  children,
}: {
  kind?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const Icon =
    kind === "error"
      ? AlertCircle
      : kind === "success"
        ? CheckCircle2
        : Info;

  return (
    <div className={`notice ${kind}`}>
      <Icon size={16} />
      <span>{children}</span>
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="spinner-line">
      <LoaderCircle size={17} className="spin" />
      {label}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
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
