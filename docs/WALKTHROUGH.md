# MathQuest – Module Walkthroughs

Three modules you must be able to defend in a technical interview:
`verifyQuestion`, the adaptive engine, and the battle reducer.

---

## 1. `verifyQuestion` — `lib/verify/question.ts`

### Purpose

This is the most important function in the repo. The LLM proposes a question;
this function either confirms it is mathematically correct and safe, or rejects
it with a precise reason code. **No LLM-generated math reaches a student unless
this function returns `{ ok: true }`.**

### Inputs

A `RawQuestion` object with:
- `stem` – the question text shown to students (10–320 chars)
- `expression` – a machine-evaluable math expression, e.g. `"3/4 + 1/2"`
- `options[4]` – each has `label` (display text), `value` (canonical number
  string), and `why` (explanation)
- `correctIndex` – the model's *claim* of which option is correct (0–3)
- `tier`, `explanation`, `hint`, `subSkillId`

### Outputs

`{ ok: true; q: VerifiedQuestion }` — with `correctIndex` set **by code** (not
by the model), a stable content-hash `id`, and `check` string like
`"3/4 + 1/2 = 5/4"`.

`{ ok: false; reason: VerifyFailureReason; detail?: string }` — one of 8 codes
(see below).

### The 8 checks (run in strict order — first failure wins)

| # | Code | What it catches |
|---|------|-----------------|
| 1 | `expression_invalid` | Expression is empty, >80 chars, contains unsafe chars (anything outside `0-9 + - * / ( ) . whitespace`), or mathjs throws (including `0/0`) |
| 2 | `option_unparseable` | Any `option.value` cannot be parsed as a rational number |
| 3 | `label_unparseable` | Any `option.label` cannot be parsed (integers, decimals, fractions `a/b`, mixed numbers `a b/c`, percentages `25%`, unit suffixes `12 cm`) |
| 4 | `label_mismatch` | `parseLabel(label) ≠ parseValue(value)` for any option — prevents showing one number while checking another |
| 5 | `no_correct_option` | Zero options equal the expression result |
| 6 | `multiple_correct` | More than one option equals the result |
| 7 | `duplicate_options` | Any two option values are equal |
| 8 | `ungrounded_number` | A numeric literal in the expression doesn't appear in the stem text and isn't whitelisted (`{0, 1, 2, 100, 1/2}`) |

> **Design note:** Checks 1–4 validate *structure*, checks 5–7 validate *math
> correctness*, check 8 validates *pedagogical honesty* (the question can't
> silently introduce a number not visible to the student).

### Why override `correctIndex` instead of rejecting?

The LLM sometimes writes the right answer at the wrong index position. Rejecting
a valid question wastes quota and latency. The verifier has already proved
exactly one option matches, so it is safe to overwrite the index.
`correctedFromModel: true` is set so stats can track how often this happens.

### Why exact rational arithmetic?

JavaScript floats: `0.1 + 0.2 === 0.30000000000000004`. With mathjs in Fraction
mode: `0.1 + 0.2` produces `Fraction { n: 3, d: 10 }`, which equals `3/10`
exactly. This is critical for Grade 5/6 decimal and fraction questions.

### Step-by-step worked example

**Input:**
```json
{
  "stem": "What is 3/4 + 1/2 in simplest fractional form?",
  "expression": "3/4 + 1/2",
  "options": [
    { "label": "5/4",  "value": "5/4",  "why": "Correct sum" },
    { "label": "1/4",  "value": "1/4",  "why": "Subtracted instead" },
    { "label": "4/6",  "value": "4/6",  "why": "Added tops and bottoms" },
    { "label": "1",    "value": "1",    "why": "Rounded down" }
  ],
  "correctIndex": 2,
  "tier": "medium",
  "explanation": "Find common denominator 4: 3/4 + 2/4 = 5/4."
}
```

**Trace through checks:**

1. `evalExact("3/4 + 1/2")` → `Fraction { n:5, d:4, s:1 }` ✓ (no throw)
2. Parse values: `5/4→5/4`, `1/4→1/4`, `4/6→2/3`, `1→1` ✓ all succeed
3. Parse labels: `"5/4"→5/4`, `"1/4"→1/4`, `"4/6"→2/3`, `"1"→1` ✓ all succeed
4. Label vs value: `5/4 == 5/4` ✓, `1/4 == 1/4` ✓, `2/3 == 2/3` ✓, `1 == 1` ✓
5. Which options equal `5/4`? → index 0 only → `matchingIndices = [0]` ✓
6. Length is 1, not >1 ✓
7. No two values are equal ✓
8. Expression tokens: `3`, `4`, `1`, `2` (from `"3/4 + 1/2"`).
   Stem tokens: `3`, `4`, `1`, `2` (from `"3/4 + 1/2"` in the stem). All found ✓

**Result:**
```json
{
  "ok": true,
  "q": {
    "correctIndex": 0,
    "correctedFromModel": true,
    "check": "3/4 + 1/2 = 5/4",
    "id": "a3f8…c2b1",
    "source": "live"
  }
}
```
The model claimed index 2; code set it to 0. `correctedFromModel: true`.

### Three likely interview questions

**Q1: Why does the verifier run server-side only? What stops someone from
bypassing it?**

> The verifier imports `"server-only"` (a Next.js package that throws at build
> time if bundled into a client chunk). Route handlers in `app/api/` call it
> before responding. The client never receives a question that hasn't passed
> verification — it only receives `VerifiedQuestion` objects, which are the
> verifier's output type. A client-side attacker could forge a POST body, but
> they'd only fool themselves; the student's score is local to their own
> localStorage.

**Q2: Why use mathjs Fraction mode instead of a dedicated fraction library like
`fraction.js`?**

> mathjs gives us a full *expression parser* (`math.evaluate("3/4 + 1/2")`)
> so we never have to write our own tokeniser. fraction.js can represent
> fractions but cannot parse arbitrary infix expressions. We use mathjs's `create`
> to make a dedicated instance configured with `{ number: "Fraction" }` so
> decimal literals are also exact — no shared state with any default instance.

**Q3: The `ungrounded_number` check (check 8) — how does it work and why is it
there?**

> We extract numeric tokens from the expression string using regex (handling
> `a/b` fractions first to avoid double-counting) and compare each token to
> tokens extracted from the stem. A token is "grounded" if it appears in the
> stem *or* is in the whitelist `{0, 1, 2, 100, 1/2}`. These constants appear
> in structural formulas (multiply by 2, percent means "per 100") without being
> stated in every problem. The check prevents a fabricated question like
> "A farmer has 3 apples" with expression `3 + 47` — the 47 is invisible to the
> student, so the verifier rejects it.

---

## 2. The Adaptive Engine — `lib/game/adaptive.ts`

### Purpose

Continuously adjusts which difficulty tier of question (`easy`, `medium`,
`hard`) a student sees during a battle, based on their recent answer streak. The
goal: keep questions in the student's Zone of Proximal Development — challenging
but not frustrating.

### Inputs to `nextAdaptive`

- `state: AdaptiveState` — current `{ tier, rightRun, wrongRun }`
- `correct: boolean` — did the student answer correctly?
- `floor: Tier` — the minimum tier allowed. `"easy"` for minion battles;
  computed by `floorForBoss(hpPct)` for boss battles.

### The promotion/demotion rules

```
2 consecutive correct → promote one tier (easy→medium, medium→hard; hard stays hard)
2 consecutive wrong   → demote one tier (hard→medium, medium→easy; easy stays easy)
1 correct after wrong → rightRun=1, wrongRun=0 (no tier change)
1 wrong after correct → wrongRun=1, rightRun=0 (no tier change)
After any change      → enforce tier ≥ floor
```

The `rightRun` and `wrongRun` counters **reset on any change** (promotion,
demotion, or the opposite kind of answer). They never accumulate past 1 without
a streak.

### `floorForBoss` — dynamic floor during boss fights

```
hp > 66%  → floor = "easy"   (Phase 1: student is winning easily)
hp > 33%  → floor = "medium" (Phase 2: getting harder)
hp ≤ 33%  → floor = "hard"   (Phase 3: final push)
```

This ratchets up difficulty as the boss weakens — preventing a student from
coast through the final phase on easy questions.

### `takeQuestion` — immutable pool draw

Tries the `want` tier first. Fallback order for `want=medium`:
`[medium, easy, hard]` — ties prefer the easier tier so a student never gets a
sudden jump to hard when medium is exhausted. Returns **new pool arrays** (via
`slice`); the original Pools object is never mutated. Returns `null` when all
pools are empty.

### Step-by-step worked example

Student starts a minion battle at `"easy"`. Floor is always `"easy"` for
minions.

| Answer # | Correct? | rightRun | wrongRun | Tier change? | New tier |
|----------|----------|----------|----------|--------------|----------|
| 1        | ✓        | 1        | 0        | —            | easy     |
| 2        | ✓        | 2 → 0    | 0        | **Promote**  | medium   |
| 3        | ✗        | 0        | 1        | —            | medium   |
| 4        | ✗        | 0        | 2 → 0    | **Demote**   | easy (floor=easy) |
| 5        | ✓        | 1        | 0        | —            | easy     |

After answer 4 the tier would demote to `easy`, which equals the floor, so no
further enforcement is needed. After answer 2 the student sees medium questions;
after answer 4 they drop back to easy.

### Three likely interview questions

**Q1: Why 2-in-a-row for promotion, not just 1?**

> A single correct answer might be a lucky guess, especially on a multiple-choice
> question with 4 options (25% baseline). Two in a row is a much stronger signal
> of genuine understanding. It also prevents rapid oscillation between tiers on
> every question.

**Q2: Why does `takeQuestion` return new pool arrays instead of mutating?**

> The battle reducer is a pure function. React StrictMode calls reducers twice
> with the same inputs in development — if the first call mutated the pool, the
> second call would see a different pool, causing non-idempotent behaviour and
> bugs that only appear in development. Returning new arrays (`pool.slice(1)`)
> leaves the original Pools object unchanged.

**Q3: How does the fallback order work for `takeQuestion`?**

> `fallbackOrder("medium")` builds `[medium, easy, hard]` by starting at the
> wanted tier, then alternating outward (lo then hi): first try `easy` (lo=0),
> then `hard` (hi=2). Ties prefer easier because we decrement `lo` before
> incrementing `hi`. So a student asked for medium gets an easy question before a
> hard one if medium is exhausted.

---

## 3. The Battle Reducer — `lib/game/battle.ts`

### Purpose

A pure `useReducer`-style reducer that is the **single source of truth** for all
battle state. Every UI interaction dispatches a typed action; the reducer
computes the new state deterministically. No mutation, no randomness, no I/O.

### State overview

| Field | Purpose |
|-------|---------|
| `pools` | Remaining questions per tier (immutable-updated on each draw) |
| `phase` | `"question" \| "feedback" \| "won" \| "lost"` — drives the UI |
| `hearts` | Remaining lives; 0 → lost |
| `enemyHp / enemyMax` | Boss/minion health; 0 → won |
| `qIndex / total` | Current question number out of maximum |
| `adaptive` | `{ tier, rightRun, wrongRun }` — the adaptive engine state |
| `combo / bestCombo` | Current/best consecutive correct streak |
| `loadout / used` | Power-up charges (hint, shield, fifty) available / spent |
| `shieldActive` | True after POWER shield, absorbs next wrong answer |
| `hintShown` | True after POWER hint used this question |
| `hidden` | Indices removed by fifty-fifty (always 2 wrong options) |
| `verdict` | Last answer result (null in question phase) |
| `history` | Array of AnswerRecord for cross-session analytics |
| `phaseJustChanged` | True when the last ANSWER crossed a boss HP phase boundary |

### The 4 actions

**`INIT { pools, mode, startTier, loadout, hearts }`**
Resets all fields. Sets HP and question total from config. Draws first question
via `takeQuestion`. If no question is available (empty pools), immediately sets
`phase: "lost", endReason: "pool_exhausted"`.

**`ANSWER { picked }`**
Guard: ignored unless `phase === "question"` and `picked` is not in `hidden`.
1. `evaluate(question, picked)` → `verdict`
2. If correct: `combo++`, `bestCombo = max(bestCombo, combo)`, deal damage via
   `damageFor(tier, combo)`, earn XP.
3. If wrong: `combo = 0`. If shield active: consume shield, no heart lost.
   Otherwise: `hearts--`.
4. Check `COMBO_REWARDS`: at `combo === 3` grant +1 hint; at `combo === 5`
   grant +1 shield.
5. Update adaptive state with `nextAdaptive(state.adaptive, verdict.correct, floor)`.
   Floor for boss = `floorForBoss(newHp / enemyMax)`; floor for minion = `"easy"`.
6. Compute boss phase before and after — set `phaseJustChanged`.
7. Append `AnswerRecord` to `history`.
8. `phase → "feedback"`.

**`NEXT`**
Guard: only from `"feedback"`. Checks terminal conditions in order:
1. `enemyHp === 0` → `"won"`, `endReason: "enemy_defeated"`
2. `hearts <= 0` → `"lost"`, `endReason: "out_of_hearts"`
3. `qIndex + 1 >= total` → `"lost"`, `endReason: "out_of_questions"`
4. `takeQuestion` returns null → `"lost"`, `endReason: "pool_exhausted"`
5. Otherwise: advance `qIndex`, set new question, reset `verdict / hintShown /
   hidden / phaseJustChanged`, `phase → "question"`.

**`POWER { item }`**
Guard: only from `"question"`.
- `hint`: needs `loadout.hint > 0 && !hintShown` → sets `hintShown: true`,
  decrements hint charge.
- `shield`: needs `loadout.shield > 0 && !shieldActive` → sets
  `shieldActive: true`, decrements shield charge.
- `fifty`: needs `loadout.fifty > 0 && hidden.length === 0` → calls
  `pickFiftyFiftyHidden(question, correctIndex)` to deterministically select 2
  wrong indices.

### `pickFiftyFiftyHidden` — deterministic fifty-fifty

Uses a DJB2 hash of the question `id` string (no `Math.random`) to shuffle the
three wrong indices and pick the first two. Always excludes `correctIndex`. Given
the same question id the same two options are always hidden — tests are
deterministic.

### Step-by-step worked example

Battle: minion mode, `startTier="easy"`, 3 hearts, no powers. Enemy HP = 80.

```
INIT   → phase="question", q=e_0 (easy), hearts=3, enemyHp=80, combo=0

ANSWER { picked: 0 } (correct, q.correctIndex=0)
  verdict.correct = true
  combo: 0→1, bestCombo: 1
  damage = damageFor("easy", 1) = round(10 * (1 + 0.1*min(1,5))) = round(10*1.1) = 11
  enemyHp: 80→69
  xp += xpForAnswer("easy", 1) = round(10*1.1) = 11
  adaptive: nextAdaptive({tier:"easy",right:0,wrong:0}, true, "easy")
          → rightRun=1, no promotion yet → {tier:"easy",rightRun:1,wrongRun:0}
  phase → "feedback"

NEXT   → enemyHp=69>0, hearts=3>0, qIndex=0+1<8 → draw q=e_1
  phase → "question"

ANSWER { picked: 0 } (correct again)
  combo: 1→2, bestCombo: 2
  damage = round(10 * 1.2) = 12, enemyHp: 69→57
  adaptive: rightRun: 1→2 ≥2 → PROMOTE easy→medium, rightRun=0
          → {tier:"medium",rightRun:0,wrongRun:0}
  phase → "feedback"

... student continues answering medium questions, gets 2 wrong in a row ...

ANSWER { picked: 1 } (wrong on medium)
  combo: 2→0, hearts: 3→2, wrongRun: 0→1
  adaptive → {tier:"medium",rightRun:0,wrongRun:1}

ANSWER { picked: 1 } (wrong again on medium)
  wrongRun: 1→2 ≥2 → DEMOTE medium→easy, wrongRun=0
  adaptive → {tier:"easy",rightRun:0,wrongRun:0}
```

### Three likely interview questions

**Q1: Why is the reducer a pure function? What does "pure" mean here?**

> A pure function returns the same output for the same inputs and causes no
> side effects. Here: no `Date.now()` (clock injected as parameter if needed),
> no `Math.random()` (fifty-fifty uses DJB2 hash of question id), no mutation
> of input arrays (we use spread and `slice`). React StrictMode calls reducers
> *twice* in development with identical inputs to detect impurity — if we mutated
> `state.pools` in place, the second call would see a depleted pool and produce
> a different result, surfacing as a bug only in dev. Purity also makes tests
> trivial: freeze the input state, call the reducer, assert the output.

**Q2: The shield absorbs a wrong answer but `wrongCount` still increments. Is
that a bug?**

> It is intentional. The shield is a mechanical power-up that prevents heart
> loss — it does not erase the fact that the student answered incorrectly. The
> `wrongCount` is used for star calculation at the end of the stage: a perfect
> stage requires zero wrong answers. If the shield also hid wrong answers, a
> student could get 3 stars trivially with shields, which breaks the star economy.

**Q3: Why are terminal conditions checked in `NEXT` rather than `ANSWER`?**

> Separating answer processing (`ANSWER`) from state advancement (`NEXT`) gives
> the UI a guaranteed `"feedback"` phase to render the verdict, highlight the
> correct answer, and show the explanation *before* anything changes. If we
> checked terminal conditions inside `ANSWER`, the phase would jump directly from
> `"question"` to `"won"` or `"lost"`, skipping the feedback screen entirely.
> The two-phase design is an intentional UX contract enforced by the reducer.
