import type { Messages } from "./fr";

export const en: Messages = {
  appTitle: "Affluence Gym",
  appTagline: "Crowd levels reported by students",
  levels: { 1: "Empty", 2: "Quiet", 3: "Moderate", 4: "Packed" },
  noData: "No data",
  loading: "Loading…",
  loadError: "Couldn't load occupancy",
  reportsCount: (n: number) => (n === 1 ? "1 recent report" : `${n} recent reports`),
  justNow: "just now",
  minutesAgo: (m: number) => `${m} min ago`,
  lastReport: (ago: string) => `Last report ${ago}`,
  reportButton: "Report crowd level",
  cancel: "Cancel",
  reportPrompt: "How busy is it?",
  reportLevel: (label: string) => `Report: ${label}`,
  sending: "Sending…",
  success: "Thanks! Your report was saved.",
  cooldown: "You already reported this gym less than 15 min ago. Try again a bit later.",
  sendError: "Couldn't send. Check your connection and try again.",
  footer: "Unofficial app · no personal data collected",
};
