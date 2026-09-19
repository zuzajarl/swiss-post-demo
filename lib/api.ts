/**
 * Thin client for the FastAPI backend.
 *
 * The browser never calls the agent tools directly — those run server-side as
 * ElevenLabs webhooks. What the browser reads is the event feed, so the demo
 * page can show which tools fired and render the last result.
 */

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';

/**
 * ngrok's free tier answers browser-looking requests with its own HTML warning
 * page instead of forwarding them. That page carries no CORS headers, so the
 * fetch fails as a CORS error even though the backend is healthy and permissive.
 * This header opts out of the interstitial; it is inert on any other host.
 */
const FETCH_INIT: RequestInit = {
  cache: 'no-store',
  headers: { 'ngrok-skip-browser-warning': 'true' },
};

/** Mirrors backend/models.py LocationSummary. Everything except the status
 *  fields comes live from the Swiss Post location API. */
export interface LocationSummary {
  id: string | null;
  name: string | null;
  type: string;
  type_label: string;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  canton?: string | null;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
  note?: string | null;
  services: string[];
  service_labels: string[];
  open_now?: boolean | null;
  open_until?: string | null;
  opens_again?: string | null;
  distance_km?: number | null;
  walking_minutes?: number | null;
  status: 'open' | 'closing' | 'closed' | 'converted';
  status_label: string;
  closure_date?: string | null;
  days_until_closure?: number | null;
}

export interface ToolEvent {
  seq: number;
  tool: string;
  label: string;
  /** Epoch ms, set by the backend when the lookup ran. */
  ts?: number;
  detail?: {
    location?: LocationSummary;
    origin?: LocationSummary;
    successors?: LocationSummary[];
    alternatives?: LocationSummary[];
    days_until_closure?: number | null;
    service?: string | null;
    [key: string]: unknown;
  } | null;
}

/**
 * Tool activity for the current call.
 *
 * The tool schemas do not pass `conversation_id` — binding it to a platform
 * dynamic variable proved fragile — so the page polls whichever conversation
 * last called a tool. With one caller at a time, which is what a demo is, that
 * is the same thing.
 */
export async function fetchEvents(conversationId?: string | null): Promise<ToolEvent[]> {
  const path = conversationId
    ? `/events/${encodeURIComponent(conversationId)}`
    : '/events/latest';
  const res = await fetch(`${BACKEND_URL}${path}`, FETCH_INIT);
  if (!res.ok) throw new Error(`Event feed returned ${res.status}`);
  const data = await res.json();
  return data.events ?? [];
}

/**
 * Deep link to the same location on Swiss Post's own public finder.
 *
 * Their router accepts /{lang}/{id} without the SEO slug, so no name-slugging
 * is needed. This is the demo's strongest provenance claim: one click lands on
 * post.ch showing the same address and hours.
 */
export function swissPostUrl(id: string | null | undefined, lang: string): string | null {
  if (!id) return null;
  return `https://places.post.ch/${lang}/${encodeURIComponent(id)}`;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, FETCH_INIT);
    if (!res.ok) return false;
    // A 200 is not enough on its own: an interposed tunnel page also answers
    // 200. Only our own payload counts as healthy.
    const data = await res.json();
    return data?.service === 'swisspost-branch-agent-backend';
  } catch {
    return false;
  }
}
