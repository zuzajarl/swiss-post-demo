'use client';

import { AlertTriangle, Mail } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/**
 * Attribution and disclosure.
 *
 * The framing is deliberate: this is a vendor proposal prepared *for* Swiss
 * Post, not a Swiss Post product. Unit8 is named as the maker, Swiss Post as
 * the recipient, and the demo-data note sits alongside rather than buried, so
 * nothing on the page can be mistaken for an official communication.
 */
export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-white/10 bg-bg-surface/40 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ─── Attribution row ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-post-yellow text-black">
              <Mail className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">{t.nav.brand}</div>
              <div className="text-[11px] text-neutral-500">{t.nav.product}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-x-10 gap-y-5">
            <a
              href="https://unit8.co"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col"
            >
              <span className="text-sm font-bold tracking-tight text-unit8 transition-opacity group-hover:opacity-80">
                Unit8
              </span>
              <span className="text-[10px] uppercase tracking-widest text-neutral-600">
                {t.footer.builtBy}
              </span>
            </a>

            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-post-yellow">Swiss Post</span>
              <span className="text-[10px] uppercase tracking-widest text-neutral-600">
                {t.footer.preparedFor}
              </span>
            </div>

            <a
              href="https://elevenlabs.io"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col"
            >
              <span className="text-sm font-bold tracking-tight text-neutral-300 transition-colors group-hover:text-white">
                ElevenLabs
              </span>
              <span className="text-[10px] uppercase tracking-widest text-neutral-600">
                {t.footer.voiceAi}
              </span>
            </a>
          </div>
        </div>

        {/* ─── Disclosure ──────────────────────────────────────────────── */}
        <div className="mt-8 rounded-xl border border-white/10 bg-bg-surface p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-closing" />
            <div>
              <p className="text-xs font-medium text-neutral-300">{t.footer.disclaimer}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{t.footer.data}</p>
            </div>
          </div>
        </div>

        {/* ─── Legal line ──────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-5 text-[11px] text-neutral-600 sm:flex-row">
          <span>
            © {new Date().getFullYear()} Unit8 SA. {t.footer.rights}
          </span>
          <span>ElevenLabs Conversational AI · Python FastAPI · Swiss Post location data</span>
        </div>
      </div>
    </footer>
  );
}
