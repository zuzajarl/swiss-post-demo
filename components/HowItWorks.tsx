'use client';

import { Wrench } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function HowItWorks() {
  const { t } = useI18n();

  return (
    <section id="how" className="border-b border-white/10 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t.how.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">{t.how.lead}</p>

        {/* ─── Call flow ─────────────────────────────────────────────────── */}
        <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {t.how.steps.map((step, i) => (
            <li key={step.title} className="bg-bg-surface p-5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-post-yellow text-xs font-bold text-black">
                {i + 1}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-white">{step.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{step.body}</p>
            </li>
          ))}
        </ol>

        {/* ─── Tools ─────────────────────────────────────────────────────── */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Wrench className="h-4 w-4 text-post-yellow" />
              {t.how.toolsTitle}
            </h3>
            <p className="mt-1 text-xs text-neutral-500">{t.how.toolsLead}</p>

            <ul className="mt-4 space-y-2.5">
              {t.how.tools.map((tool) => (
                <li key={tool.name} className="rounded-lg border border-white/10 bg-bg-surface p-3.5">
                  <code className="font-mono text-xs text-post-yellow">{tool.name}</code>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{tool.body}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* ─── Integration ─────────────────────────────────────────────── */}
          <div>
            <h3 className="text-lg font-semibold text-white">{t.how.integrationTitle}</h3>
            <dl className="mt-5 space-y-4">
              {t.how.integration.map((item) => (
                <div key={item.term} className="border-l-2 border-post-yellow/40 pl-4">
                  <dt className="text-sm font-semibold text-white">{item.term}</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-neutral-400">{item.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
