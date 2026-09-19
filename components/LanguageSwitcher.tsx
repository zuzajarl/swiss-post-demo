'use client';

import clsx from 'clsx';
import { LANGUAGES, useI18n } from '@/lib/i18n';

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-bg-elevated p-0.5">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          title={l.native}
          aria-pressed={lang === l.code}
          className={clsx(
            'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
            lang === l.code
              ? 'bg-post-yellow text-black'
              : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200',
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
