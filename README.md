# MathQuest: Realm of Numbers

> A gamified Grade 5–6 math platform aligned to the Georgia Standards of Excellence.
> Students explore six curriculum realms, read verified AI-generated worked examples,
> fight quiz battles with adaptive difficulty, and earn XP, stars, coins, and badges.
> **No database. No accounts. No paid APIs.** Progress lives in the browser.

**Live demo:** _Add deployed Vercel URL here after publishing._

---

## Screenshots

Capture final app images into `docs/screens/` and embed below:

| Screen | Screenshot |
|---|---|
| Landing | `docs/screens/landing.png` |
| Grade select | `docs/screens/grade-select.png` |
| World map | `docs/screens/world-map.png` |
| Realm | `docs/screens/realm.png` |
| Learning (Read tab) | `docs/screens/learning.png` |
| Battle | `docs/screens/battle.png` |
| Results | `docs/screens/results.png` |
| Profile and journal | `docs/screens/profile-journal.png` |

---

## Test It In 60 Seconds

```bash
npm install
npm run dev          # http://localhost:3000
```

1. **Start quest** → enter an optional hero name → choose **Grade 5**.
2. **Fraction Forest** → open the realm → **Start stage**.
3. Read the lesson, open the **VIDEO** and **PICTURE** tabs.
4. **Start battle**: answer two questions correctly, then two wrong.
5. Open **Quest Journal** — watch the tier label change (Easy → Medium → Easy).
6. Verify deployment health: `GET http://localhost:3000/api/health`

Without `GEMINI_API_KEY`, lessons and questions fall back to pre-verified local seed
content. The source tag in the UI corner reads **seed** in that case.

---

## PDF Requirement Map

| Requirement | How it is met | Files |
|---|---|---|
| 1. Grade/topic selection and worked explanations | Six realms × 5 stages × lesson with Big Idea, worked examples (stepwise), Common Mistake, Real World | [data/curriculum.ts](data/curriculum.ts), [components/lesson/LearnView.tsx](components/lesson/LearnView.tsx) |
| 2. Mathematically correct AI explanations | Every worked-example expression is evaluated with exact rational arithmetic (mathjs Fraction mode) and matched against `answerValue`; rejected content is retried or replaced by seed | [lib/llm/lesson.ts](lib/llm/lesson.ts), [lib/verify/lesson.ts](lib/verify/lesson.ts), [hooks/useLesson.ts](hooks/useLesson.ts) |
| 3. AI infographic beside explanation | Realm illustration plate (`public/art/plate-<realmId>.png`) shown on the PICTURE tab next to the code-drawn SVG diagram; captioned honestly | [components/lesson/LearnView.tsx](components/lesson/LearnView.tsx), [data/artManifest.ts](data/artManifest.ts) |
| 4. Adaptive verified practice, per-question feedback, final score | 8-check verifier; 3-tier adaptive engine; CORRECT/NOT QUITE ribbon with explanation and check line; "SCORE: X of Y" in results | [lib/verify/question.ts](lib/verify/question.ts), [lib/game/adaptive.ts](lib/game/adaptive.ts), [lib/game/battle.ts](lib/game/battle.ts), [components/MathQuestApp.tsx](components/MathQuestApp.tsx) |
| 5. XP, progress, badges, encouraging messages | XP with combo bonus, coins, star rating, 10 badges, accuracy-bracket copy | [lib/game/xp.ts](lib/game/xp.ts), [lib/game/badges.ts](lib/game/badges.ts), [lib/game/copy.ts](lib/game/copy.ts), [lib/game/progress.ts](lib/game/progress.ts) |
| 6. Video-style explanation | Narrated slideshow (browser `speechSynthesis`) with play/pause, scene dots, captions toggle; degrades to a reading-timer if no voice loads | [components/lesson/VideoPlayer.tsx](components/lesson/VideoPlayer.tsx), [hooks/useNarration.ts](hooks/useNarration.ts) |

---

## Architecture

```
Browser routes (Next.js App Router)
  ├── Zustand persist store (localStorage, Zod-validated at hydration)
  │     player: XP, level, coins, hearts, skill state, badges, settings
  │
  ├── hooks/useLesson  →  session cache  →  POST /api/lesson  →  seed fallback
  ├── hooks/useQuestions  →  session cache  →  POST /api/questions  →  seed fallback
  │
  ├── hooks/useBattle  →  useReducer(battleReducer)   ← pure, no I/O
  │     lib/game/adaptive.ts   tier promotion/demotion
  │     lib/game/evaluate.ts   answer checking (client-safe subset)
  │     lib/game/xp.ts         damage, XP, combo multiplier
  │
  └── components/diagrams  →  validateVisualData  →  crisp-edge SVG

POST /api/lesson  or  POST /api/questions
  ├── withGuards  (body limit, rate-limit per-IP, Zod schema)
  ├── TTL+LRU in-memory cache  →  serve without calling LLM
  ├── GoogleGenAI.models.generateContent (JSON mode)
  │     primary model  →  fallback model  (retry + backoff)
  ├── verifyQuestion / verifyLesson  (mathjs Fraction, server-only)
  └── fallback to local seed JSON if LLM unavailable

public/art/   pre-committed pixel-art PNGs (offline pipeline)
  art-src/ → scripts/art-process.ts (sharp) → public/art/
  Runtime never calls an image API.
```

**The LLM proposes; deterministic code verifies.** No AI-generated math content
reaches a student unless the verifier has recomputed it using exact arithmetic.
Each question must have exactly one numerically correct option. Each worked-example
expression must evaluate to the claimed answer. See [docs/TECHNICAL.md](docs/TECHNICAL.md).

---

## Stack And AI Services

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js App Router + TypeScript strict | One deploy; route handlers keep the API key server-side |
| LLM | Gemini via `@google/genai`, free tier, JSON mode | 100% free; JSON output mode avoids regex parsing |
| Validation | Zod | One schema = type + validator + JSON shape for the model |
| Math | mathjs Fraction mode (server-only) | Exact rational arithmetic; `0.1 + 0.2 = 3/10` exactly |
| State | Zustand with localStorage persist | Local-only progress; no accounts, no database |
| Battle | Pure `useReducer` in `lib/game/battle.ts` | Testable, deterministic; React StrictMode-safe |
| Styling | Tailwind + CSS variables + hand-built pixel CSS | Bespoke dark-fantasy look; no generic component theme |
| Diagrams | Code-drawn crisp-edge SVG | AI image models garble digits; real numbers are real HTML |
| Video | Browser `speechSynthesis` | No paid TTS; runs offline; degrades gracefully |
| Art | `sharp`-generated pixel-art; optional Pollinations via `npm run art:gen` | Runtime never calls an image API |
| Tests | Vitest (Node environment) | ESM-native; pure-function focus |
| Hosting | Vercel | Named in the project brief |

**External network calls at runtime:**
- `POST api.google.com/v1beta/models/…:generateContent` — questions and lessons
- None from the browser (all AI calls are server-side route handlers)

**Offline-only (scripts, never at runtime):**
- Pollinations image generation — `npm run art:gen`

---

## Environment Variables

Set these in Vercel → Settings → Environment Variables, or in `.env.local` locally:

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes (for live generation) | Server-only Gemini API key. Never prefix `NEXT_PUBLIC_`. |
| `GEMINI_MODEL_PRIMARY` | Yes (for live generation) | Primary model name, e.g. `gemini-2.0-flash-lite` |
| `GEMINI_MODEL_FALLBACK` | No | Fallback model if primary is unavailable or rate-limited |

Without these variables, `/api/lesson` and `/api/questions` serve verified seed
content with `source: "seed"`. The app is fully functional with seeds only.

Copy `.env.example` to `.env.local` and fill in your values:
```bash
cp .env.example .env.local
```

---

## Setup And Running

```bash
npm install
npm run dev          # development server at http://localhost:3000
npm run typecheck    # TypeScript strict check
npm run lint         # ESLint
npm test             # Vitest (all pure-logic tests)
npm run build        # production bundle
```

### Seed Bank (pre-verified offline content)

The app ships with seed content in `data/lessons/` and `data/seed-questions/`.
To regenerate it (requires `GEMINI_API_KEY`):

```bash
npm run seed:lessons    # generate verified lessons for all 18 sub-skills
npm run seed:verified   # generate verified question pools for all sub-skills
```

### Art Pipeline (offline, no API key needed by default)

```bash
# Step 1 – generate raw images into art-src/ (requires internet; ~16s between requests)
npm run art:gen

# Step 2 – process raw images to public/art/ using sharp
npm run art:process
```

You can also drop images manually into `art-src/` using the exact slot names from
[data/artManifest.ts](data/artManifest.ts), then run `npm run art:process`.

### Release Check

```bash
npm run release-check   # runs all 10 checks; exits 1 on any FAIL
```

---

## Measured Reliability

> No measured percentage is claimed here. Run `npm run eval` to generate
> `docs/EVAL.md` with the real accept rate, reject reasons, and latency data,
> then paste the headline numbers below with model and date.

_Add generated reliability stats from `docs/EVAL.md` here before submission._

---

## Adaptive Logic In Six Lines

1. A stage begins at the realm's saved difficulty tier (default: Easy).
2. **Two consecutive correct answers** promote one tier (Easy → Medium → Hard).
3. **Two consecutive wrong answers** demote one tier (Hard → Medium → Easy).
4. A single answer of either kind clears the opposite streak counter.
5. Guardian (boss) battles apply a rising difficulty floor by HP phase (Easy → Medium → Hard).
6. The ending tier and last 20 outcomes are saved to `localStorage` for the next stage.

The Quest Journal shows the current tier label (EASY / MEDIUM / HARD) and a mastery
fill bar (rolling accuracy over the last 20 answers) for each realm, so a reviewer
can observe the adaptive logic live. The legend reads: "↑ Up: 2 correct in a row.
↓ Down: 2 wrong in a row."

Implementation: [`lib/game/adaptive.ts`](lib/game/adaptive.ts)
Full walkthrough: [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md)

---

## Demo Mode

**Demo mode is off by default.** Enable it in **Settings → Demo mode: unlock all realms**.
When active, all realm and stage unlock checks are bypassed so a reviewer can jump
to any content immediately. Question verification is **not** bypassed; only the
progression locks are removed. Demo mode must be re-enabled after each page refresh;
it is stored in `localStorage` and does not touch any server state.

---

## Privacy

No personal data is collected or transmitted. The only server calls are the Gemini
API requests (curriculum content only; no student data included). All progress is
stored on the player's own device in `localStorage` and can be erased at any time
via **Settings → Reset progress**.

---

## Known Limitations

- The verifier checks expression consistency and literal grounding — it does not
  prove that the story text of a question means the same thing as its expression.
- Questions are numeric-answer multiple-choice only (no free-text entry).
- In-memory rate limiting is per warm serverless instance; concurrent instances each
  maintain their own counters (best-effort).
- Seed content is automatically verified; only a sample has been hand-reviewed.
- Committed art is currently deterministic script-generated pixel-art (via `sharp`), not
  AI-generated, because the free Pollinations image service was unavailable during
  development; run `npm run art:gen` then `npm run art:process` to produce real AI art
  when the service is available.
- Browser speech voices vary by browser and device; the narration player degrades
  to a timed reading display if no voice loads within 1.5 s.
- Progress is per browser and per device; it can be cleared by the player.
- Georgia Standards of Excellence alignment has not been reviewed by a certified
  Georgia teacher.
- Free-tier Gemini quotas can reduce live generation availability.

---

## Credits And Disclosures

**Fonts:** Pixelify Sans and Atkinson Hyperlegible via `next/font/google` (SIL OFL).

**Art:** See [`docs/ART_CREDITS.md`](docs/ART_CREDITS.md). The committed pixel-art (scenes, characters, plates) is generated offline by [`scripts/art-process.ts`](scripts/art-process.ts) using `sharp` as deterministic themed placeholders, because the free Pollinations image service was unavailable during development. Running `npm run art:gen` (Pollinations) then `npm run art:process` regenerates the assets as real AI art when the service is available. No image generation API is called at runtime.

**AI-assistance disclosure:** _TODO: describe the AI tools and assistance actually
used for this submission (e.g., Copilot, ChatGPT, Gemini). Write this truthfully._
