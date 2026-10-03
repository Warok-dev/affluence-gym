import type { Level } from "./config";

/**
 * Level word for an average level, using the backend's thresholds so that the
 * word and the "calm" colour always agree: "Calme" means an average <= 2.0,
 * exactly the rule behind the calm flag (backend/app/history.py, CALM_MAX_LEVEL).
 */
export function levelFromAverage(avg: number): Level {
  if (avg <= 1.5) return 1;
  if (avg <= 2.0) return 2;
  if (avg <= 3.0) return 3;
  return 4;
}
