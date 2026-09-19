# Branch Closure Redirect & FAQ Agent

A voice agent demo for Swiss Post. Callers affected by the branch network changes reach an
agent that knows every location — its status, closure date, nearest alternatives, partner
branch hours, parcel pickup points and digital alternatives — in German, French, Italian
and English, with automatic language detection.

This repo is everything outside the ElevenLabs platform: a web page with the agent
embedded, five read-only tools the agent calls, the location dataset, and a knowledge base
in four languages. The agent itself is built in the platform — see
[agent/SETUP.md](agent/SETUP.md).

> **Live data, demo closures.** Locations, addresses, coordinates, opening hours, holiday
> calendars and live open/closed state come from Swiss Post's own public location service.
> The closure dates are the exception: that service carries no closure field, so the nine
> closures in `data/closures.json` are invented for this demo and attached to real branches.

---

## Why this use case

Public data only, no transactional integration, no customer records. That is what makes it
the fastest path through procurement for a first production voice agent, and it is why the
five tools are all reads: there is nothing here to sign off on beyond publishing
information Swiss Post already publishes.

---

## Running it

Two processes. Backend first:

```bash
python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt
```

```bash
.venv/bin/python -m uvicorn backend.main:app --reload --port 8000
```

Then the web app:

```bash
npm install && npm run dev
```

Copy `.env.example` to `.env.local`, set `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` to your agent,
and open http://localhost:3000. Without an agent id the page still renders; the call
button reports the missing id rather than failing silently.

For the agent to reach the tools, expose the backend publicly — `ngrok http 8000` — and
put that URL in both `.env.local` and the tool definitions. Full walkthrough in
[agent/SETUP.md](agent/SETUP.md).

---

## Layout

```
app/              Next.js pages
components/       Demo UI — call control, transcript, tool activity, result card
lib/              i18n dictionary (DE/FR/IT/EN) and the backend client
backend/          FastAPI: the five tools, one file per tool
  services/
    post_api.py   Client for the live Swiss Post location service
    locations.py  Shaping, ranking, closure-overlay join
data/             Closure overlay, programme facts, digital services
knowledge-base/   RAG documents, four languages
agent/            System prompt, tool schemas, platform setup guide
```

---

## The five tools

All read-only, all on public data. They return structured facts — no phrasing. How the
agent says it is the prompt's job, not the tool's.

| Tool | Answers |
|---|---|
| `find_location` | Which location does the caller mean? Postcode, municipality, branch name, or a whole spoken sentence, misspellings included. |
| `get_branch_status` | Is it open, closing, closed or converted — and when, and what replaces it. |
| `find_alternatives` | Nearest usable access points, designated successors first, then by distance; filterable by service needed. |
| `get_opening_hours` | Hours for a given day, with that location's own holiday calendar applied. |
| `get_digital_alternative` | Which digital or doorstep service removes the counter visit entirely. |

Try one directly — this hits the live Swiss Post service:

```bash
curl -s -X POST http://localhost:8000/webhook/find_location -H 'Content-Type: application/json' -d '{"query":"die Post in Burgdorf","language":"de"}'
```

`/health` reports whether the upstream service is reachable; the tools are useless without
it and that failure is otherwise only visible mid-call.

---

## How the page shows its work

The tools run server-side as webhooks, so the browser never sees them fire. The backend
keeps a short in-memory log per conversation and the page polls it, which is what fills the
tool activity panel and the result card while the agent is talking.

That panel is also the check on hallucination: if the agent states a closure date and no
`get_branch_status` call appears beside it, the date came from the model rather than the
data.

---

## Where the data comes from

Locations are read live, per request, from Swiss Post's own public location service:

```
https://places.post.ch/StandortSuche/StaoCacheServiceV2/api/v1
```

It needs no API key. It is the service behind the location finder at places.post.ch, and
three of its endpoints carry this demo — `/Geocode` (text → locations), `/Find` (locations
in an area) and `/Poi` (one location in full, as XML). Responses are cached in-process so
a caller never waits on a repeat lookup.

That gives the agent every real branch, partner counter, My Post 24 terminal and Postomat
in Switzerland, with addresses, coordinates, per-day opening hours, each location's own
public holiday calendar, which services it offers, and whether it is open right now.

**What it does not carry is closure status.** The service describes the network as it
stands today: a branch that has already closed is simply absent, and a closure announced
for next year looks identical to any other open branch. So closures are a separate,
deliberately small overlay in `data/closures.json`, joined onto live records by POI id —
exactly the join a pilot would make against the real branch network publication. The nine
entries there point at real branches but their dates are invented; swap the file for the
real publication and nothing else changes. `CLOSURE_OVERLAY=off` disables it entirely.

---

## Deploying to Render

Two services from one repo, defined in [render.yaml](render.yaml): a Python service for
the agent tools and a Node service for the page.

1. **New → Blueprint** in Render, pointed at this repo. Deploy the backend first.
2. Check it: `curl -s https://<backend>.onrender.com/health` — you want `"status":"ok"`
   and `"upstream":{"reachable":true}`.
3. On the web service, set `NEXT_PUBLIC_PYTHON_BACKEND_URL` to that URL and
   `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` to your agent. Saving triggers a rebuild, which is
   required: `NEXT_PUBLIC_*` values are inlined at build time, not read at runtime.
4. Repoint the five tool definitions in ElevenLabs at the new backend URL, and set
   `ELEVENLABS_WEBHOOK_SECRET` on the backend to match the dashboard secret.

### Warming it before a demo

Free instances sleep after about 15 minutes idle and take roughly 50 seconds to wake —
far longer than a tool call waits. A sleeping backend means the agent fails on the first
question of a demo, which is the worst possible moment.

Wake both services a couple of minutes beforehand:

```bash
curl -s https://<backend>.onrender.com/health > /dev/null
curl -s https://<web>.onrender.com > /dev/null
```

Then run one real lookup, which also warms the location cache so the first live answer is
fast:

```bash
curl -s -X POST https://<backend>.onrender.com/webhook/find_location \
  -H 'Content-Type: application/json' \
  -d '{"query":"Burgdorf","language":"de"}' > /dev/null
```

For an unattended demo, point a free external pinger (cron-job.org, UptimeRobot) at the
backend's `/health` every 10 minutes for the day. Ping the backend only — Render's free
tier allots a fixed number of instance hours per month, and keeping both services awake
around the clock will exhaust it.

---

## Targets

The brief sets ≥70% containment and ≥95% language detection. Evaluation criteria to
configure in the platform are at the bottom of [agent/prompt.md](agent/prompt.md); how to
read them back is in [agent/SETUP.md](agent/SETUP.md).
