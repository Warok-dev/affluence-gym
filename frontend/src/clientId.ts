// Anonymous identifier used only for the anti-spam cooldown. No personal data.
const STORAGE_KEY = "affluence-gym.client_id";
let memoryId: string | null = null;

/** RFC 4122 v4 UUID. crypto.randomUUID only exists in secure contexts (HTTPS/localhost),
 *  so fall back to getRandomValues, which also works over plain HTTP on a LAN. */
export function generateUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function getClientId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = generateUuid();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Storage blocked (private mode, etc.): keep a per-session id in memory.
    memoryId ??= generateUuid();
    return memoryId;
  }
}
