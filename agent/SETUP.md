# Building the agent in the ElevenLabs platform

Everything in this repo is the half that lives outside the platform: the tools, the data,
the knowledge base and the web demo. This file is the checklist for wiring the agent itself.

---

## 1. Expose the backend

The platform calls the tools over HTTPS, so the FastAPI app needs a public URL.

```bash
uvicorn backend.main:app --reload --port 8000
```

In a second terminal:

```bash
ngrok http 8000
```

Take the `https://` URL ngrok prints. Check it answers:

```bash
curl https://YOUR-NGROK-URL/health
```

You should get `{"status":"ok", ..., "upstream":{"reachable":true, ...}}`. `upstream` is
the live Swiss Post location service — if it says `reachable: false`, the tools will fail
and there is no point configuring the agent yet.

Put the same ngrok URL in `.env.local` as `NEXT_PUBLIC_PYTHON_BACKEND_URL` so the web demo
reads the tool feed from the same place.

> For anything beyond a laptop demo, deploy the backend properly and use its real domain.
> An ngrok URL changes every restart and every tool definition has to be edited again.

---

## 2. Create the agent

In the ElevenLabs dashboard: **Conversational AI → Agents → Create agent**.

| Setting | Value |
|---|---|
| Name | Branch Closure Redirect & FAQ |
| System prompt | The prompt block from [prompt.md](prompt.md) |
| First message | `Schweizerische Post, Filialnetz-Auskunft. Wie kann ich helfen?` |
| LLM | A model with strong multilingual handling — the four languages matter more here than raw reasoning |
| Language | Enable German, French, Italian and English, with auto-detection on |
| Voice | A voice that carries all four languages without an obvious accent shift; test it in Italian, which is usually the weakest |
| Max duration | 10 minutes is plenty; these are short calls |

**Do not** set a fixed conversation language. Detection is one of the two KPIs and forcing
a language defeats it.

---

## 3. Upload the knowledge base

**Knowledge base → Add document**, and upload all twelve files from `knowledge-base/`:

```
knowledge-base/de/  programm.md   faq.md   dienstleistungen.md
knowledge-base/fr/  programme.md  faq.md   prestations.md
knowledge-base/it/  programma.md  faq.md   prestazioni.md
knowledge-base/en/  programme.md  faq.md   services.md
```

Upload all four languages, not just German. Retrieval works far better when the caller's
question and the indexed passage are in the same language.

Then turn **RAG on** for the agent so it retrieves from these rather than stuffing all
twelve files into the prompt.

The knowledge base answers *programme* questions. Location-specific answers must come from
the tools — the prompt already enforces that split, and the KB files repeat it at the top
so a retrieved chunk carries the rule with it.

---

## 4. Add the five tools

**Tools → Add tool → Webhook**, once per file in `agent/tools/`:

| Tool | Endpoint |
|---|---|
| `find_location` | `POST /webhook/find_location` |
| `get_branch_status` | `POST /webhook/branch_status` |
| `find_alternatives` | `POST /webhook/find_alternatives` |
| `get_opening_hours` | `POST /webhook/opening_hours` |
| `get_digital_alternative` | `POST /webhook/digital_alternatives` |

For each one: replace `michell-perigonial-ashlyn.ngrok-free.dev` with your public URL, and copy the `description`
and `request_body_schema` across verbatim. The descriptions are written to steer *when*
the model reaches for each tool, so trimming them costs you accuracy.

Pass `conversation_id` on every call — it is what drives the live tool panel in the web
demo. In the platform, bind it to the system variable for the conversation id.

### Signing

Set a webhook secret in the dashboard and put the same value in `.env` as
`ELEVENLABS_WEBHOOK_SECRET`. The backend then verifies the HMAC-SHA256 signature on every
request and rejects anything older than five minutes.

Leave the variable empty during local development and verification is skipped — convenient
on a laptop, never acceptable anywhere public.

---

## 5. Connect the phone number

**Phone numbers → Import number → SIP trunk**, then assign it to this agent.

You need from the telephony provider: the SIP URI, credentials, and the allowed IP ranges
to whitelist. Inbound only — the agent never dials out.

Once assigned, call the number. A real PSTN call is the only way to find the problems a
browser test hides: codec quality, DTMF, barge-in behaviour, and how the voice copes with
a caller on a mobile in a noisy street.

---

## 6. Test it

Browser first, at `http://localhost:3000` with `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` set in
`.env.local`. The page's scenario cards give you a script per language.

Then work through these, which between them touch every tool and every status:

| Say | Should happen |
|---|---|
| "Die Post in Burgdorf schliesst?" | Filiale Burgdorf 1, closing 31 December 2026, then real nearby options |
| "Wie lange hat die noch offen?" | Live hours for that branch, holiday calendar applied |
| "La poste d'Yverdon ferme bientôt?" | French throughout, Yverdon-les-Bains 1, closing 31 January 2027 |
| "La posta di Mendrisio chiude?" | Italian, Mendrisio Borgo, closing 30 September 2026 |
| "The post office in Herisau?" | English; two real branches there, so it asks which one |
| "Je suis allée à la poste de Payerne." | Converted to a partner branch, then real alternatives |
| "Wo kann ich in Payerne Geld abheben?" | Only locations that actually offer payments |
| "Fantasiehausen" | Says it cannot find it, asks for a postcode |
| "I just need to send letters from home." | Digital route: E-Post and WebStamp |
| Start in German, switch to French mid-call | Follows the switch, stays in French |

Because the data is live, a branch's hours — and whether it is open right now — are
whatever Swiss Post says at the moment you call. Only the closure dates are fixed by the
overlay.

Watch the tool panel while you do it. If the agent answers a closure date without
`get_branch_status` appearing in the panel, it invented the date — tighten the prompt.

---

## 7. What to measure

The brief sets two targets: **≥70% containment** and **≥95% language detection**.

Configure the evaluation criteria from the bottom of [prompt.md](prompt.md) in the
platform's analysis settings, then read them off the conversation history. Containment is
calls that ended without a handover; detection is calls answered in the caller's language
throughout.

Two failure modes worth watching for specifically:

- **A wrong answer that sounds confident.** Any status or date spoken without a matching
  tool call is a hallucination, and it is worse here than a handover would have been.
- **Detection failing on Swiss German.** It is the most likely language failure and the
  most consequential one. Test it with real dialect speakers, not with standard German.

---

## Going to production

Locations are already live. The one piece that is not real is the closure overlay in
`data/closures.json`: nine real branches with invented dates. Before any pilot:

1. Replace the `closures` array with the real branch network publication, keyed by POI id.
   The ids are stable and come straight from the location service.
2. Deploy the backend behind a real domain, with `ELEVENLABS_WEBHOOK_SECRET` set.
3. Decide the caching policy. The in-process cache in `post_api.py` is sized for a demo;
   a production deployment across several instances wants a shared cache and a documented
   staleness budget.

Two things worth agreeing with Swiss Post before a pilot, since both are assumptions this
demo makes on their behalf:

- **Terms of use for the location service.** It is public and unauthenticated, but that is
  not the same as licensed for a third party to build on. Get it in writing.
- **Where closure data comes from, and who keeps it current.** A wrong closure date spoken
  confidently to a citizen is the worst failure this agent can produce, and it is the one
  piece the live API cannot protect you from.
