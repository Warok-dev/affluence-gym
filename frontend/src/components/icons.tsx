import type React from "react";

// Authored icons: one 24-unit grid, 2-unit round strokes, currentColor.
export function CheckIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RetryIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V9h-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Icon({ children, size = 22 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Two facing columns: the scoreboard. */
export function BoardIcon() {
  return (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M12 4v16M7.5 9v6M16.5 9v6" />
    </Icon>
  );
}

export function DumbbellIcon() {
  return (
    <Icon>
      <path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12" />
    </Icon>
  );
}

export function PlusIcon() {
  return (
    <Icon size={18}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function TrashIcon() {
  return (
    <Icon size={18}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </Icon>
  );
}

export function BackIcon() {
  return (
    <Icon size={18}>
      <path d="M15 5l-7 7 7 7" />
    </Icon>
  );
}

export function MinusIcon() {
  return (
    <Icon size={18}>
      <path d="M5 12h14" />
    </Icon>
  );
}

/** An open book: the exercise library. */
export function BookIcon() {
  return (
    <Icon>
      <path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5zM12 6v13" />
    </Icon>
  );
}
