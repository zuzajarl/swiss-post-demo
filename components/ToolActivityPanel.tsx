'use client';

import clsx from 'clsx';
import {
  Clock,
  MapPin,
  Search,
  Signpost,
  Smartphone,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ToolEvent } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const TOOL_ICONS: Record<string, LucideIcon> = {
  find_location: Search,
  get_branch_status: MapPin,
  find_alternatives: Signpost,
  get_opening_hours: Clock,
  get_digital_alternative: Smartphone,
};

export default function ToolActivityPanel({ events }: { events: ToolEvent[] }) {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 bg-bg-surface">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Wrench className="h-4 w-4 text-post-yellow" />
        <h3 className="text-sm font-semibold text-white">{t.demo.tools}</h3>
        {events.length > 0 && (
          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-neutral-300">
            {events.length}
          </span>
        )}
      </div>

      <div className="scroll-thin max-h-72 flex-1 overflow-y-auto px-4 py-3">
        {events.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-600">{t.demo.toolsEmpty}</p>
        ) : (
          <ol className="space-y-2.5">
            {events.map((e) => {
              const Icon = TOOL_ICONS[e.tool] ?? Wrench;
              return (
                <li key={`${e.tool}-${e.seq}`} className="flex gap-2.5 animate-slide-in">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-post-yellow-dim">
                    <Icon className="h-3.5 w-3.5 text-post-yellow" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-post-yellow">{e.tool}</div>
                    <div className="mt-0.5 break-words text-xs leading-relaxed text-neutral-300">
                      {e.label}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <p className={clsx('border-t border-white/10 px-4 py-2.5 text-[11px] text-neutral-600')}>
        {t.demo.toolsHint}
      </p>
    </div>
  );
}
