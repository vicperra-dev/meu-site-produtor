"use client";

/**
 * Design System — conjunto único de ícones SVG (stroke, 24x24).
 * Uso: <Icon name="calendar" className="w-4 h-4" />
 */

import React from "react";

export type IconName =
  | "home"
  | "calendar"
  | "clock"
  | "download"
  | "ticket"
  | "box"
  | "user"
  | "bell"
  | "help"
  | "music"
  | "check"
  | "check-circle"
  | "x"
  | "x-circle"
  | "copy"
  | "search"
  | "chevron-down"
  | "chevron-right"
  | "arrow-right"
  | "credit-card"
  | "file"
  | "play"
  | "refresh"
  | "alert"
  | "info"
  | "external"
  | "history"
  | "star"
  | "chat"
  | "lock"
  | "camera"
  | "wallet"
  | "sparkles";

const PATHS: Record<IconName, React.ReactNode> = {
  home: <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  download: <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />,
  ticket: (
    <>
      <path d="M3 9V7a2 2 0 012-2h14a2 2 0 012 2v2a3 3 0 000 6v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a3 3 0 000-6z" />
      <path d="M13 5v2m0 4v2m0 4v2" strokeDasharray="1 3" />
    </>
  ),
  box: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </>
  ),
  bell: <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 015.8 1c0 2-3 2.5-3 4M12 17.5h.01" />
    </>
  ),
  music: <path d="M9 18V6l10-2v11M9 18a3 3 0 11-6 0 3 3 0 016 0zm10-3a3 3 0 11-6 0 3 3 0 016 0z" />,
  check: <path d="M5 13l4 4L19 7" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6m0-6l-6 6" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  "arrow-right": <path d="M4 12h16m0 0l-6-6m6 6l-6 6" />,
  "credit-card": (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" />
      <path d="M14 3v6h6" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5-11-6.5z" />,
  refresh: <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
  alert: <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </>
  ),
  external: <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6m0 0v6m0-6L10 14" />,
  history: (
    <>
      <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
      <path d="M3 3v5h5M12 7v5l4 2" />
    </>
  ),
  star: <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 3z" />,
  chat: <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.4-4 8-9 8a9.9 9.9 0 01-4-.8L3 21l1.9-3.8A7.4 7.4 0 013 12c0-4.4 4-8 9-8s9 3.6 9 8z" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 118 0v4" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8a2 2 0 012-2h1.5l1.5-2h8l1.5 2H19a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7a2 2 0 012-2h13a1 1 0 011 1v2" />
      <path d="M3 7v11a2 2 0 002 2h14a2 2 0 002-2v-8a2 2 0 00-2-2H3z" />
      <path d="M16 14h.01" />
    </>
  ),
  sparkles: <path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7L12 4zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15zM5 14l.8 1.7L7.5 16.5l-1.7.8L5 19l-.8-1.7L2.5 16.5l1.7-.8L5 14z" />,
};

export function Icon({
  name,
  className = "w-4 h-4",
  strokeWidth = 1.8,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
