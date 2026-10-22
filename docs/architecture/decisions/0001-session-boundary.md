---
status: accepted
scope: architecture
date: 2026-10-22
deciders: Ed Wright
supersedes:
superseded_by:
---

# 0001. A pure engine behind a session boundary

## Context

The practice game at `/play` runs entirely in the browser: a static Next.js site with no server. An online version, where a server rolls the dice, is a possible later step and is not built. The game needed an engine that is testable without a browser, and a way to run it that would not have to be torn out if a server ever ran it.

Mitchi has no hidden information: every die is public. That means one event stream serves every seat and needs no per-seat redaction, which is what makes a cheap boundary possible at all.

## Decision

The engine is pure and never rolls dice. The dice arrive inside the action, so the engine is a function of state and action only. A typed pipeline (Intent, then ActionRequest, then Action with dice supplied) and a `GameSession` interface (view, allowed intents, optional pacing) separate the browser-only `local/` implementation, which owns the store, the timers, the randomness and the bots' driver, from the engine. A future server-run version would return the same action, event and session types.

Randomness and timers live only in `local/` (SES-1 in `docs/architecture/game-engine.md`). There is one known exception: the display-only dice-hold timer in `ui/`, which WO-0018 replaces.

The rules of the engine and the session are in `game-engine.md`. This record holds the alternatives and the trade-off.

## Consequences

### Positive

- Tests and the 2,000-game simulation are deterministic: scripted games replay exactly.
- The engine is lint-enforced pure (imports checked by dependency-cruiser, globals by ESLint), so a server could run it unchanged.
- No per-seat redaction would be needed online, because no information is hidden.

### Negative

- Every roll takes a two-step completion (`ActionRequest` to `Action`), which adds a type layer. The caller prerolls a pair of dice even when fewer are used.
- The session contract is speculative. It already carries online-shaped fields (`pending` as an acknowledgement, `pacing` absent online) for a feature that does not exist, and WO-0018 is expected to change it. The first real server will probably show what is wrong with it: reconnection, ordering and authentication are not modelled.
- The `ui/` hold timer breaks the "timers only in `local/`" rule until WO-0018. "`ui/` never imports `local/`" is checked, but the rest of SES-2 is review only.

### Neutral / Trade-offs

- The cost to reverse is moderate, from fan-out, not lock-in. It is in-process TypeScript in one repo, with no data model, public API, vendor or money. But every fixture, story, commentary row and test keys on the action and event unions and `GameSession`, so changing them is a wide refactor.
- This is an up-front abstraction cost for an unbuilt feature. It was accepted because a pure engine is needed for testing anyway, and the boundary itself is thin.
- The design bets on "no hidden information". If a variant ever hid dice, the cheap seam would not hold.

## Alternatives Considered

### Option A: The engine owns a seeded RNG in its state

**Why considered:** The usual answer for replay and determinism, and it hides dice from callers.

**Why rejected:** A server must roll for fairness, so the dice must be supplied from outside. A seeded RNG in state also makes the roll count depend on hidden state; passing the dice in keeps it visible in the action.

### Option B: Dice by callback

**Why considered:** The engine takes an injected `roll(n)` function. It is the obvious middle option and is still pure from the caller's side.

**Why rejected:** The effect is hidden inside the reducer. That breaks determinism and makes the action log non-replayable.

### Option C: The UI owns the reducer, with no session seam

**Why considered:** What most small React games do, and the least code.

**Why rejected:** It ties the rules to React and the browser, and the online reuse that motivated the work would mean extracting an engine later, with every component already written against the state.

### Option D: A server-authoritative, event-sourced model from the start

**Why considered:** The model an online version resembles: a server rolls, clients replay the events.

**Why rejected:** There is no server, and the site is static. This is closer to "not now" than a contest, and the chosen design keeps the door open without building it.
