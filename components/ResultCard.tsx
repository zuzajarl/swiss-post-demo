'use client';

import clsx from 'clsx';
import { ArrowRight, CalendarClock, Clock, ExternalLink, Footprints, MapPin } from 'lucide-react';
import { swissPostUrl, type LocationSummary, type ToolEvent } from '@/lib/api';
import { LOCALES, useI18n } from '@/lib/i18n';

const STATUS_STYLES: Record<LocationSummary['status'], string> = {
  open: 'border-status-open/30 bg-status-open/10 text-status-open',
  closing: 'border-status-closing/30 bg-status-closing/10 text-status-closing',
  closed: 'border-status-closed/30 bg-status-closed/10 text-status-closed',
  converted: 'border-status-converted/30 bg-status-converted/10 text-status-converted',
};

/** '2026-12-31' → '31.12.2026'. An ISO date on screen reads like raw data. */
function formatDate(iso: string | null | undefined, lang: keyof typeof LOCALES): string {
  if (!iso) return '';
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function freshness(ts: number | undefined, t: ReturnType<typeof useI18n>['t']): string {
  if (!ts) return t.demo.justNow;
  const minutes = Math.floor((Date.now() - ts) / 60000);
  return minutes < 1 ? t.demo.justNow : t.demo.minutesAgo.replace('{n}', String(minutes));
}

/** "Live from Swiss Post · just now" — the provenance claim, stated once. */
function LiveBadge({ ts }: { ts?: number }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-status-open/30 bg-status-open/10 px-2 py-0.5 text-[11px] font-medium text-status-open">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-open opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-status-open" />
      </span>
      {t.demo.liveFrom} · {freshness(ts, t)}
    </span>
  );
}

/** Opens the same branch on Swiss Post's own finder — one click to verify. */
function VerifyLink({ id }: { id: string | null | undefined }) {
  const { t, lang } = useI18n();
  const href = swissPostUrl(id, lang);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-neutral-400 underline decoration-dotted underline-offset-2 transition-colors hover:text-post-yellow"
    >
      {t.demo.verifyAtSource}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function StatusChip({ location }: { location: LocationSummary }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        STATUS_STYLES[location.status],
      )}
    >
      {location.status_label}
    </span>
  );
}

function LocationRow({ location, highlight }: { location: LocationSummary; highlight?: boolean }) {
  const { t } = useI18n();

  return (
    <div
      className={clsx(
        'rounded-lg border p-3',
        highlight ? 'border-post-yellow/40 bg-post-yellow-dim' : 'border-white/10 bg-bg-elevated',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{location.name}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wide text-neutral-500">
            {location.type_label}
            {location.note ? ` · ${location.note}` : ''}
          </div>
        </div>
        {location.distance_km != null && (
          <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-neutral-300">
            {location.distance_km < 1
              ? `${Math.round(location.distance_km * 1000)} m`
              : `${location.distance_km.toFixed(1)} km`}
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1 text-xs text-neutral-400">
        {location.address && (
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{location.address}</span>
          </div>
        )}
        {location.open_now != null && (
          <div className="flex items-start gap-1.5">
            <Clock className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              {location.open_now
                ? `${t.demo.openNow}${location.open_until ? ` — ${t.demo.until} ${location.open_until}` : ''}`
                : t.demo.closedNow}
            </span>
          </div>
        )}
        {location.walking_minutes != null && (
          <div className="flex items-start gap-1.5">
            <Footprints className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              {location.walking_minutes === 1
                ? t.demo.minuteWalkOne
                : t.demo.minutesWalk.replace('{n}', String(location.walking_minutes))}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        {location.service_labels.map((s) => (
          <span key={s} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-400">
            {s}
          </span>
        ))}
        <span className="ml-auto">
          <VerifyLink id={location.id} />
        </span>
      </div>
    </div>
  );
}

/**
 * Renders the most recent location lookup as a card.
 *
 * The agent answers out loud; this is what makes the answer checkable by a
 * room watching the demo — the addresses, distances and hours it just spoke.
 */
export default function ResultCard({ events }: { events: ToolEvent[] }) {
  const { t, lang } = useI18n();

  const latest = [...events]
    .reverse()
    .find((e) => e.detail?.location || e.detail?.alternatives?.length);

  if (!latest) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-bg-surface p-6 text-center">
        <p className="text-xs text-neutral-600">{t.demo.resultEmpty}</p>
      </div>
    );
  }

  const primary = latest.detail?.location ?? latest.detail?.origin;
  const alternatives = latest.detail?.alternatives ?? latest.detail?.successors ?? [];
  const daysLeft = latest.detail?.days_until_closure;

  return (
    <div className="rounded-xl border border-white/10 bg-bg-surface p-4 animate-fade-up">
      {primary && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <LiveBadge ts={latest.ts} />
            <VerifyLink id={primary.id} />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-white">{primary.name}</h3>
              <p className="mt-0.5 text-xs text-neutral-500">{primary.address}</p>
            </div>
            <StatusChip location={primary} />
          </div>

          {primary.closure_date && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-bg-elevated px-3 py-2">
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-status-closing" />
              <span className="text-xs text-neutral-300">
                {t.demo.closureOn} {formatDate(primary.closure_date, lang)}
              </span>
              {typeof daysLeft === 'number' && daysLeft >= 0 && (
                <span className="rounded bg-status-closing/15 px-1.5 py-0.5 text-[11px] font-medium text-status-closing">
                  {daysLeft} {t.demo.daysLeft}
                </span>
              )}
              {/* The live badge above vouches for the address and hours. It must
                  not be read as vouching for this date, which is demo data. */}
              <span className="ml-auto rounded border border-white/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500">
                {t.demo.demoDate}
              </span>
            </div>
          )}
        </>
      )}

      {alternatives.length > 0 && (
        <div className="mt-4">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <ArrowRight className="h-3 w-3" />
            {t.demo.replacement}
          </h4>
          <div className="mt-2 space-y-2">
            {alternatives.map((a, i) => (
              <LocationRow key={a.id} location={a} highlight={i === 0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
