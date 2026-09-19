'use client';

import clsx from 'clsx';
import { Cpu, Quote, Target, User } from 'lucide-react';
import type { Scenario } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n';

interface Props {
  selectedId: string | null;
  onSelect: (scenario: Scenario) => void;
}

export default function ScenarioPicker({ selectedId, onSelect }: Props) {
  const { t, scenarios } = useI18n();

  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{t.demo.scenariosTitle}</h3>
      <p className="mt-1 text-xs text-neutral-500">{t.demo.scenariosHint}</p>

      <div className="mt-4 space-y-2.5">
        {scenarios.map((s) => {
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              aria-pressed={active}
              className={clsx(
                'w-full rounded-xl border p-4 text-left transition-colors',
                active
                  ? 'border-post-yellow/50 bg-post-yellow-dim'
                  : 'border-white/10 bg-bg-surface hover:border-white/20',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-white">{s.title}</span>
              </div>

              <span className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-500">
                <User className="h-3 w-3 shrink-0" />
                {s.caller}
              </span>

              <p className="mt-2 text-xs leading-relaxed text-neutral-400">{s.situation}</p>

              {active && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3 animate-fade-up">
                  <div>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-post-yellow">
                      <Quote className="h-3 w-3" />
                      {t.demo.sayLabel}
                    </span>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-200">{s.say}</p>
                  </div>
                  <div>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      <Target className="h-3 w-3" />
                      {t.demo.expectLabel}
                    </span>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-400">{s.expect}</p>
                  </div>

                  {/* What the agent is doing behind the answer, in plain words —
                      this is the part a non-technical viewer takes away. */}
                  <div className="rounded-lg border border-unit8/25 bg-unit8/5 p-2.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-unit8">
                      <Cpu className="h-3 w-3" />
                      {t.demo.mechanismLabel}
                    </span>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-400">{s.mechanism}</p>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
