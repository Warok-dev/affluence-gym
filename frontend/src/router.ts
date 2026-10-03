import { useEffect, useState } from "react";

// Hash routes ("#/seances/en-cours"): no server configuration needed, works offline
// in the installed PWA, and keeps the back button meaningful.
export const ROUTES = {
  occupancy: "/",
  workouts: "/seances",
  activeWorkout: "/seances/en-cours",
  workout: (id: string) => `/seances/${encodeURIComponent(id)}`,
  exercises: "/exercices",
  exercise: (id: string) => `/exercices/${encodeURIComponent(id)}`,
  program: (id: string) => `/programmes/${encodeURIComponent(id)}`,
} as const;

function current(): string {
  const path = window.location.hash.replace(/^#/, "");
  return path || "/";
}

export function useRoute(): string {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const onChange = () => {
      setRoute(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigate(path: string): void {
  window.location.hash = path;
}
