'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Mail } from 'lucide-react';
import { checkHealth } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const { t } = useI18n();
  const [backendUp, setBackendUp] = useState<boolean | null>(null);

  // The demo is worthless if the tool backend is down, and that failure is
  // otherwise invisible until mid-call — so surface it in the chrome.
  useEffect(() => {
    let active = true;
    const ping = () => checkHealth().then((ok) => active && setBackendUp(ok));
    ping();
    const timer = setInterval(ping, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-post-yellow text-black">
            <Mail className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">{t.nav.brand}</div>
            <div className="hidden text-[11px] text-neutral-500 sm:block">{t.nav.product}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a href="#demo" className="hidden text-sm text-neutral-400 transition-colors hover:text-white md:block">
            {t.nav.demo}
          </a>
          <a href="#how" className="hidden text-sm text-neutral-400 transition-colors hover:text-white md:block">
            {t.nav.how}
          </a>

          <a
            href="https://unit8.co"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-[11px] text-neutral-500 transition-colors hover:text-neutral-300 sm:block"
          >
            {t.footer.builtBy}{' '}
            <span className="font-semibold text-unit8">Unit8</span>
          </a>

          <span
            className={clsx(
              'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium lg:flex',
              backendUp === false
                ? 'border-status-closed/30 bg-status-closed/10 text-status-closed'
                : 'border-status-open/30 bg-status-open/10 text-status-open',
            )}
          >
            <span
              className={clsx(
                'h-1.5 w-1.5 rounded-full',
                backendUp === false ? 'bg-status-closed' : 'bg-status-open',
              )}
            />
            {backendUp === false ? t.nav.backendDown : t.nav.backendUp}
          </span>

          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
