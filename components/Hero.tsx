'use client';

import { ArrowRight, Languages, PhoneCall } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      {/* Warm wash behind the headline, in the house colour. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ background: 'radial-gradient(60% 70% at 50% 0%, #FFCC00 0%, transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-post-yellow/30 bg-post-yellow-dim px-3 py-1 text-xs font-medium text-post-yellow">
          <Languages className="h-3.5 w-3.5" />
          {t.hero.eyebrow}
        </span>

        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
          {t.hero.title}
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-400 sm:text-lg">
          {t.hero.lead}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#demo"
            className="inline-flex items-center gap-2 rounded-lg bg-post-yellow px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            <PhoneCall className="h-4 w-4" />
            {t.hero.ctaDemo}
          </a>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:border-white/30 hover:text-white"
          >
            {t.hero.ctaHow}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <dl className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
          {t.hero.stats.map((s) => (
            <div key={s.label} className="bg-bg-surface px-5 py-6">
              <dt className="text-3xl font-bold text-post-yellow">{s.value}</dt>
              <dd className="mt-1 text-sm text-neutral-400">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
