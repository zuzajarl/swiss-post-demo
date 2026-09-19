'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConversation } from '@11labs/react';
import clsx from 'clsx';
import {
  AlertCircle,
  Bot,
  Info,
  Mic,
  MessageSquare,
  Phone,
  PhoneOff,
  User,
} from 'lucide-react';
import { fetchEvents, type ToolEvent } from '@/lib/api';
import { useI18n, type Scenario } from '@/lib/i18n';
import ScenarioPicker from './ScenarioPicker';
import ToolActivityPanel from './ToolActivityPanel';
import ResultCard from './ResultCard';

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || '';

// The tools run server-side, so the browser learns about them by polling.
// 1.2s keeps the panel feeling live without hammering the backend.
const EVENT_POLL_MS = 1200;

interface Message {
  id: string;
  role: 'user' | 'agent';
  text: string;
}

export default function VoiceDemo() {
  const { t, scenarios } = useI18n();

  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<ToolEvent[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const transcriptRef = useRef<HTMLDivElement>(null);
  // Tool calls are logged without a conversation id, so the feed is shared
  // across calls. Remember how many events existed when this call started and
  // show only what comes after — otherwise call two opens showing call one.
  const eventOffset = useRef(0);

  const conversation = useConversation({
    onMessage: (msg: { message: string; source: string }) => {
      if (!msg?.message) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${prev.length}`,
          role: msg.source === 'user' ? 'user' : 'agent',
          text: msg.message,
        },
      ]);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    },
  });

  const status = conversation.status;
  const isConnected = status === 'connected';

  // Reset the selected scenario when the site language changes, so the panel
  // never shows a German scenario next to French copy.
  useEffect(() => {
    setScenario(null);
  }, [scenarios]);

  // Follow the transcript as it grows.
  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  // Poll the tool feed while the call is up. The backend falls back to the
  // most recently active conversation when no id is available.
  useEffect(() => {
    if (!isConnected) return;

    let active = true;
    const poll = async () => {
      try {
        const next = await fetchEvents();
        if (active) setEvents(next.slice(eventOffset.current));
      } catch {
        // A transient failure here should not interrupt a live call; the next
        // tick will pick the events back up.
      }
    };

    poll();
    const timer = setInterval(poll, EVENT_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isConnected]);

  const start = useCallback(async () => {
    setError(null);

    if (!AGENT_ID) {
      setError(t.demo.noAgent);
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(t.demo.micDenied);
      return;
    }

    setMessages([]);
    setEvents([]);

    try {
      eventOffset.current = (await fetchEvents()).length;
    } catch {
      eventOffset.current = 0;
    }

    try {
      // The agent detects the caller's language itself, so no language
      // override is passed here — that detection is part of what the demo
      // is meant to show.
      const id = await conversation.startSession({ agentId: AGENT_ID });
      setConversationId(typeof id === 'string' ? id : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [conversation, t.demo.micDenied, t.demo.noAgent]);

  const stop = useCallback(async () => {
    await conversation.endSession();
    setConversationId(null);
  }, [conversation]);

  const stateLabel = conversation.isSpeaking
    ? t.demo.speaking
    : isConnected
      ? t.demo.listening
      : status === 'connecting'
        ? t.demo.connecting
        : t.demo.idleHint;

  return (
    <section id="demo" className="border-b border-white/10 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t.demo.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">{t.demo.lead}</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* ─── Scenarios ─────────────────────────────────────────────── */}
          <aside>
            <ScenarioPicker selectedId={scenario?.id ?? null} onSelect={setScenario} />
          </aside>

          {/* ─── Call, transcript, tools, result ───────────────────────── */}
          <div className="space-y-6">
            {/* Call control */}
            <div className="rounded-xl border border-white/10 bg-bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-11 w-11 items-center justify-center">
                    {isConnected && (
                      <span className="absolute inset-0 rounded-full bg-post-yellow/30 animate-pulse-ring" />
                    )}
                    <span
                      className={clsx(
                        'relative flex h-11 w-11 items-center justify-center rounded-full',
                        isConnected ? 'bg-post-yellow text-black' : 'bg-white/10 text-neutral-400',
                      )}
                    >
                      <Mic className="h-5 w-5" />
                    </span>
                  </span>

                  <div>
                    <div className="text-sm font-semibold text-white">{stateLabel}</div>
                    {isConnected && (
                      <div className="mt-1.5 flex h-4 items-end gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span
                            key={i}
                            className={clsx(
                              'w-0.5 rounded-full bg-post-yellow',
                              conversation.isSpeaking ? `h-3 animate-wave-${i}` : 'h-1 opacity-40',
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={isConnected ? stop : start}
                  disabled={status === 'connecting'}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50',
                    isConnected
                      ? 'bg-status-closed text-white hover:opacity-90'
                      : 'bg-post-yellow text-black hover:opacity-90',
                  )}
                >
                  {isConnected ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                  {isConnected ? t.demo.end : t.demo.start}
                </button>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-status-closed/30 bg-status-closed/10 px-3 py-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-closed" />
                  <p className="text-xs leading-relaxed text-status-closed">{error}</p>
                </div>
              )}

              <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-neutral-600">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                {t.demo.detectedNote}
              </p>
            </div>

            {/* Transcript + tools */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col rounded-xl border border-white/10 bg-bg-surface">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <MessageSquare className="h-4 w-4 text-post-yellow" />
                  <h3 className="text-sm font-semibold text-white">{t.demo.transcript}</h3>
                </div>

                <div ref={transcriptRef} className="scroll-thin h-72 overflow-y-auto px-4 py-3">
                  {messages.length === 0 ? (
                    <p className="py-6 text-center text-xs text-neutral-600">
                      {t.demo.transcriptEmpty}
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {messages.map((m) => (
                        <li key={m.id} className="flex gap-2.5 animate-fade-up">
                          <span
                            className={clsx(
                              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                              m.role === 'user' ? 'bg-white/10' : 'bg-post-yellow-dim',
                            )}
                          >
                            {m.role === 'user' ? (
                              <User className="h-3.5 w-3.5 text-neutral-400" />
                            ) : (
                              <Bot className="h-3.5 w-3.5 text-post-yellow" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                              {m.role === 'user' ? t.demo.you : t.demo.agent}
                            </div>
                            <p className="mt-0.5 break-words text-xs leading-relaxed text-neutral-200">
                              {m.text}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <ToolActivityPanel events={events} />
            </div>

            {/* Result */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white">{t.demo.result}</h3>
              <ResultCard events={events} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
