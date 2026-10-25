# MathQuest Technical Notes

> This document is written for a reviewer with a technical background.
> For setup and usage, see [README.md](../README.md).

---

## Architecture

```
Browser (Next.js App Router, React 19)
  │
  ├── app/           route files (server components)
  │     ├── page.tsx → MathQuestScreen screen="home"
  │     ├── grade/page.tsx
  │     ├── map/page.tsx
  │     ├── realm/[id]/page.tsx
  │     ├── realm/[id]/learn/[subSkillId]/page.tsx  → LearnView
  │     ├── battle/[id]/[stage]/page.tsx             → MathQuestScreen screen="battle"
  │     ├── profile|journal|settings/page.tsx
  │     └── api/
  │           ├── questions/route.ts  (POST, nodejs runtime)
  │           ├── lesson/route.ts     (POST, nodejs runtime)
  │           └── health/route.ts     (GET)
  │
  ├── components/
  │     ├── MathQuestApp.tsx   all screen rendering, battle state machine
  │     ├── lesson/LearnView.tsx + VideoPlayer.tsx
  │     ├── diagrams/Diagrams.tsx  (crisp-edge SVG, no canvas)
  │     └── ArtImage.tsx, OfflineBanner.tsx
  │
  ├── lib/                      (pure logic and server utilities)
  │     ├── game/               NO React, NO network — pure functions only
  │     │     adaptive.ts, battle.ts, badges.ts, copy.ts, createGate.ts, evaluate.ts
  │     │     heroes.ts, progress.ts, skill.ts, streak.ts, unlock.ts, xp.ts
  │     ├── map/                island.ts, pathfinding.ts, travel.ts
  │     ├── verify/             SERVER-ONLY (imports server-only package)
  │     │     expression.ts, question.ts, lesson.ts
  │     ├── llm/                SERVER-ONLY
  │     │     gemini.ts, lesson.ts, prompts.ts, questions.ts
  │     ├── server/             SERVER-ONLY
  │     │     cache.ts (TTL + LRU), seed.ts (static imports)
  │     ├── http/guards.ts      SERVER-ONLY (rate limiter, Zod guard)
  │     ├── audio/sfx.ts        CLIENT — lazy AudioContext blips
  │     ├── client/             CLIENT — dynamic seed loaders
  │     ├── config.ts           shared game constants
  │     ├── diagramData.ts      shared (pure, no I/O)
  │     └── schemas.ts          Zod schemas + inferred types
  │
  ├── store/gameStore.ts        Zustand persist (localStorage key mathquest:v2, v1 migration)
  ├── hooks/                    useBattle, useLesson, useQuestions, useNarration, useSfx, …
  └── data/
        curriculum.ts, heroes.ts, layout.ts, artManifest.ts
        lessons/{realm}__{sub}.json     (seed lessons, committed)
        seed-questions/{realm}__{sub}.json  (seed questions, committed)
```

The browser never imports verifier modules, never calls Gemini directly, and never
needs an account or server-held state. Progress is per browser.

---

## Generation And Verification Pipeline

### Questions (`POST /api/questions`)

1. **Guard**: `withGuards` checks body size (≤ 4 KB), parses JSON, validates
   against `QuestionsRequestSchema` (Zod), applies per-IP sliding-window rate
   limiting (20 req/min per warm instance).

2. **Cache check**: `serverCache.get(key)` — key includes realm, stage, prompt
   version, and avoid-list hash. TTL 10 minutes. LRU eviction at 64 entries.

3. **LLM call**: `generateStagePool(realmId, stageIndex, avoid, deps)` calls
   the Gemini client with the question prompt. JSON output mode. Retry up to 2×
   per model with exponential back-off on 429/503/timeout.

4. **Verification**: For each proposed question, `verifyQuestion` runs 8 checks
   (see below). Valid questions accumulate in the pool; invalid ones are counted
   by reason code. Missing tier slots are filled from seed content (source:
   "mixed").

5. **Seed fallback**: If the LLM throws any `LlmError`, the entire pool is
   filled from pre-verified seed JSON (source: "seed").

6. **Response**: 200 with `{ questions, source, rejectReasons }`.

### Lessons (`POST /api/lesson`)

Same guard and cache flow. `getLesson` calls the Gemini client with the lesson
prompt. `verifyLesson` checks every worked example. On verification failure the
call is retried once with the failure reason appended to the prompt. On repeated
failure the seed lesson is served. Source is "live", "cache", or "seed".

---

## Verifier — `lib/verify/question.ts`

8 checks run in order; first failure wins:

| # | Reason code | What it catches |
|---|---|---|
| 1 | `expression_invalid` | Empty / too-long / unsafe-chars expression; or mathjs throws (including 0/0) |
| 2 | `option_unparseable` | Any `option.value` cannot be parsed as a rational number |
| 3 | `label_unparseable` | Any `option.label` cannot be parsed (integer, decimal, fraction a/b, mixed a b/c, percent %, unit suffix) |
| 4 | `label_mismatch` | `parseLabel(label) ≠ parseValue(value)` for any option |
| 5 | `no_correct_option` | Zero options equal the expression result |
| 6 | `multiple_correct` | More than one option equals the result |
| 7 | `duplicate_options` | Any two option values are equal |
| 8 | `ungrounded_number` | A numeric literal in the expression does not appear in the stem and is not in the whitelist `{0, 1, 2, 100, 1/2}` |

The verifier overrides `correctIndex` when exactly one option is numerically
correct — the model sometimes places the right answer at the wrong index.
`correctedFromModel: true` is set when this happens.

**Why exact rational arithmetic?** JavaScript floats: `0.1 + 0.2 === 0.30000000000000004`.
With mathjs Fraction mode: `0.1 + 0.2 → 3/10` exactly. This is critical for
Grade 5/6 fraction and decimal questions.

### Lesson verifier — `lib/verify/lesson.ts`

Checks each worked example:

| Reason code | What it catches |
|---|---|
| `too_few_examples` | Fewer than 1 worked example |
| `example_invalid` | Expression fails the same safety checks as question expressions |
| `example_wrong_answer` | `evalExact(expression) ≠ answerValue` |
| `example_ungrounded` | A numeric literal in the expression not grounded in the problem text |

---

## Adaptive Logic And Persistence

`lib/game/adaptive.ts`:

- **Promote**: 2 consecutive correct answers → tier up (Easy→Medium→Hard; capped).
- **Demote**: 2 consecutive wrong answers → tier down (Hard→Medium→Easy; floored at `floor`).
- **Reset**: opposite kind of answer clears the other streak counter.
- Boss battles apply a dynamic floor from `floorForBoss(hpPct)`:
  `hp > 66% → Easy | hp > 33% → Medium | hp ≤ 33% → Hard`.

`lib/game/skill.ts`:

- `updateSkill` appends outcomes to the realm's `recent` array (capped at 20).
- `masteryPct` = correct / recent * 100 (requires ≥ 5 answers).
- `startTierFor` reads the last tier saved; boss stages floor at Medium.

`lib/game/progress.ts` owns all stage-completion side-effects: XP, stars, coins,
streak, badge evaluation, skill and sub-skill stat recording.

---

## Game Formulas

| Quantity | Formula |
|---|---|
| Hearts | `min(5, 3 + floor((level − 1) / 3))` |
| Damage | `DAMAGE_BASE[tier] × (1 + 0.1 × min(combo, 5))` |
| XP per answer | `XP_BASE[tier] × (1 + 0.1 × min(combo, 5))` |
| Stars | 3 (win, 0 wrong), 2 (win, 1 wrong), 1 (win, ≥ 2 wrong), 0 (retreat) |
| Coins | +2 per correct answer + 5 per star on win + 25 for boss win |
| Star XP bonus | `stars × 20 XP`; doubled for a boss stage |

Tier base values in `lib/config.ts`:
- `DAMAGE_BASE = { easy: 10, medium: 15, hard: 25 }`
- `XP_BASE = { easy: 10, medium: 20, hard: 35 }`

---

## API Reference

All requests are subject to a 4 KB body limit and a sliding-window per-IP rate
limit (20 per minute, per warm serverless instance). The limiter prunes stale
entries after each request to prevent memory growth.

### `POST /api/questions`

**Request body** (`QuestionsRequestSchema`):
```json
{ "realmId": "g5-fractions", "stageIndex": 0, "avoid": [] }
```
`avoid`: up to 24 stems, max 320 chars each.

**Response 200**:
```json
{
  "questions": [ ...VerifiedQuestion ],
  "source": "live" | "cache" | "mixed" | "seed",
  "rejectReasons": { "expression_invalid": 1, ... }
}
```

**Error codes**: 400 (bad JSON), 413 (body too large), 422 (Zod failure), 429 (rate limit), 500.

### `POST /api/lesson`

**Request body** (`LessonRequestSchema`):
```json
{ "realmId": "g5-fractions", "subSkillId": "g5-fractions-add-sub" }
```

**Response 200**:
```json
{ "lesson": Lesson, "source": "live" | "cache" | "seed" }
```

### `GET /api/health`

```json
{ "status": "ok", "seed": { "lessons": 18, "questions": 324 } }
```

Returns 503 with `"status": "degraded"` and a `"reason"` field if seed inventory
is incomplete.

---

## Major Decisions And Rejected Alternatives

| Area | Chosen | Rejected / reason |
|---|---|---|
| Framework | Next.js App Router | Vite+Express: two deploys, CORS, extra Vercel config; Streamlit: poor game UI |
| LLM | Gemini via `@google/genai` free tier | OpenRouter: unstable free models; Groq: second key; OpenAI: paid; Ollama: can't run on Vercel |
| Validation | Zod | Yup/Joi: weaker TS inference; Ajv: separate schema and type sync |
| Math | mathjs Fraction mode | JS floats: rounding; `eval`/`Function`: injection risk; fraction.js: no expression parser |
| State | Zustand persist | Redux Toolkit: boilerplate; Context: no persistence; Jotai: no benefit |
| Battle | Pure `useReducer` | XState: learning cost; scattered useState: untestable |
| Styling | CSS variables + pixel CSS | MUI/Chakra: generic look; styled-components: runtime cost |
| Game engine | DOM + CSS + React | Phaser/PixiJS: bundle weight, second state system, poor a11y |
| Animation | CSS transforms + steps() | GSAP: imperative; Lottie: needs assets; sprite sheets: AI can't give consistent frames |
| Icons | Code-drawn pixel glyphs | lucide-react: smooth, off-style |
| Fonts | Pixelify Sans + Atkinson Hyperlegible | Browser defaults: not pixel-art |
| Art | Offline generation + sharp | DALL-E/Imagen: paid; Canva: no free API; board crops: low-res |
| Video | Browser speechSynthesis | HeyGen/D-ID: paid; server TTS: extra route/latency; pre-rendered MP4s: 18 large files |
| Math text | Custom parseMath() | KaTeX: LLM LaTeX output is malformed; bundle cost |
| Tests | Vitest (Node) | Jest: ESM/TS config friction |

---

## UI System And Art Pipeline

The global CSS (`app/globals.css`) defines:
- **Design tokens** (`--bg-night`, `--panel`, `--gold`, `--parchment`, etc.)
- **Data-realm theming** — sets `--accent` and `--scene-tint` per realm
- **Readable mode** — `data-readable="true"` on `<html>` switches font and disables text shadows and animations
- **Reduced motion** — `data-motion="reduce"` compresses all animation durations
- **Pixel-style panels** via `box-shadow` steps (no external PNG frames)
- **Responsive layouts** — single codebase; compact HUD and bottom nav on mobile

`components/diagrams/Diagrams.tsx` renders four SVG diagram types using values
validated and clamped by `lib/diagramData.ts:validateVisualData`. Invalid LLM
visual data never reaches an SVG renderer.

### Art Pipeline (offline)

1. `data/artManifest.ts` — typed list of ~33 image slots with Pollinations prompts.
2. `scripts/gen-images.ts` — fetches raw images into `art-src/` at ≥16 s intervals.
3. `scripts/art-process.ts` — reads `art-src/*.png`, applies per-kind processing
   with `sharp` (downscale → palette-quantise → nearest-neighbour upscale), writes
   `public/art/{file}.png`.
4. Committed images are served as static files; `ArtImage` shows a themed fallback
   if a file is absent.

`sharp` is a dev dependency. It is never imported from app code; `eslint` and
`release-check` both verify this.

---

## Hero System & Battle Mechanics

Phase 5 introduced hero classes, passives, active special abilities, and weapon tiers:

### Hero Classes & Passives
- **Knight**: Weapon `sword`. Passive `Stalwart` absorbs the first wrong answer damage in a battle (`passiveSpent: true`, shields hearts). Special `Power Strike` charges in 3 correct answers (max 2 uses/battle), dealing 2x base damage on the next correct hit (stacks multiplicatively with favoured multiplier to 3x). Favoured against *Fraction Forest* and *Decimal Dunes*.
- **Mage**: Weapon `staff`. Passive `Insight` grants +1 hint charge on battle initialization. Special `Arcane Clarity` charges in 2 correct answers (max 3 uses/battle), immediately eliminating 2 incorrect choices for the active question. Favoured against *Coordinate Canyon* and *Algebra Archipelago*.
- **Ranger**: Weapon `bow`. Passive `Quick Study` confers a +15% XP multiplier on all XP rewards. Special `Second Wind` charges in 4 correct answers (max 1 use/battle), restoring 1 heart clamped to maximum hearts. Favoured against *Measurement Mountain* and *Data Depths*.

### Favoured Realms & Weapon Scaling
- **Favoured Multiplier**: Attacking in a class's favoured realm deals 1.5x damage on correct answers.
- **Weapon Tiers**: Weapon names scale dynamically with player level (`Trainee` Lv1-2, `Apprentice` Lv3-4, `Master` Lv5-7, `Grandmaster` Lv8+), surfacing in HUD, battle arena, and profile view.

### Pure Reducer Purity & Testing
`lib/game/battle.ts` remains 100% deterministic and pure. Actions `INIT`, `ANSWER`, `USE_HINT`, `USE_SHIELD`, `USE_FIFTY_FIFTY`, `SPECIAL`, and `NEXT` never perform side effects or mutate state. Deep freezing verifies that no inputs or state trees are mutated.

---

## Balance Simulation

The balance simulation suite (`scripts/balance-sim.ts`, tested in `scripts/balance-sim.test.ts`) simulates 288,000 battles across all 144 configurations:
- **3 Hero Classes** × **2 Modes** (Minion, Boss) × **6 Realms** × **4 Skill Bands** (Struggling: 40%, Target: 70%, Advanced: 90%, Control: 0%).
- **Deterministic PRNG**: Uses Mulberry32 seeded per configuration, allowing exact reproducibility across CI environments.
- **Bot Decision Model**: Simulates realistic player behavior (uses Arcane Clarity when armed, picks among visible options, fires Power Strike immediately, reserves Second Wind until heart loss).
- **Target Bands**: Evaluates overall win rates, favoured realm spread, inter-class parity, and zero-win control checks, automatically generating `docs/BALANCE.md`.

---

## What The Verifier Cannot Catch

- Whether the story text of a question truly encodes the computation in its expression.
- Whether a distractor explanation is pedagogically useful or misleading.
- Whether Georgia Standards of Excellence alignment is correct (not reviewed by a certified educator).
- Whether a generated visual scene communicates the lesson accurately.
- Whether a browser voice is clear or appropriate on a particular device.
- Whether a worked-example step sequence makes sense pedagogically.

These remain subjects for the manual QA checklist (`docs/QA.md`) and human review.

---

## Future Work

- Free-text answer entry alongside multiple choice.
- Multi-instance rate limiting via Redis or Vercel KV.
- Teacher review of standards tagging and lesson wording.
- Additional diagram types (tape diagram, double number line).
- Streak recovery mechanics and daily challenges.
- Accessibility audit by a screen reader user.
