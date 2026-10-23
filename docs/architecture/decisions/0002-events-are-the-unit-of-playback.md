---
status: accepted
scope: architecture
date: 2026-10-22
deciders: Ed Wright
supersedes:
superseded_by:
---

# 0002. Events are the unit of playback; state is a fold of events

Extends `0001-session-boundary.md`, which stays accepted. 0001 put a pure engine behind a session boundary; this record changes what crosses that boundary and when.

## Context

WO-0018. The practice game at `/play` could not be followed by a first-time player. One engine action returned its final state and several events at once: a roll to start returned the roll and the next player's turn together, and a stop returned everything from the turn end to the next turn's start. `SessionView.state` was always that final state, so the screen jumped straight to the next player. The WO-0016 stopgap, a display-only timer in `ui/` with a matching extra handover delay in `local/`, held the previous dice on one panel while every other panel had already moved on. The screen showed a mix of the previous and the next turn, and the timer broke Step.

The product owner wanted play to unfold as an online game against people does: one player does one thing, everyone sees it, a pause, then play moves on. That needs states between the events of one action, such as "Player 2 has stopped, Player 3's turn has not started", and the engine could not express them: every derived value already pointed at the next player.

This is a bet on the online version 0001 kept the door open for. Nothing online is built. The choice below is cheap today and becomes costly once a server ships, which is why it is recorded now.

## Decision

The engine gains a public, pure `applyEvent(state, event): GameState`, and `applyAction` is rebuilt as "decide the events, then fold them": nothing assigns a state field except the fold. `GameState.acting: Seat | null` is stored, not derived. The session, not the engine, releases an action's events one beat at a time, grouped by the pure `beatsOf`; the engine keeps no time and never splits an action.

Invariant: folding an action's events onto the state before it gives exactly the state `applyAction` returned. A test checks this after every action of 2,000 seeded games.

## Consequences

### Positive

- One rules implementation. The fold and `applyAction` cannot drift, because `applyAction` is the fold.
- Every panel shows the same moment. The UI reads the state as of the last released beat and the beat itself; no panel keeps a copy or a timer, and no rule is restated in `ui/`. The `ui/` timer exception to SES-1 is gone.
- A future online client that receives only events can rebuild state with the same `applyEvent`, `beatsOf` and `Playback`, with no state snapshots and no timing from the server.
- Pause holds every panel and Step releases exactly one beat, because a beat is the unit the session releases.

### Negative

- Events are the source of truth, so every field the fold needs must be on an event. `potTaken` gained `hand` and `rollOffStarted` gained `tiedOn` for this reason. Any later rule that needs new data is an event contract change.
- Once a server exists, client and server folds must match exactly. `applyEvent` will need versioning, or a way to detect version skew, before that ships. Not designed here.
- `acting` and `Turn.seat` are two fields for related facts. Their relation (`acting` is null or equals the turn's seat) is an invariant held by tests, not by the types.
- Fan-out, in this repo now: every fixture, story and test keys on these types.
- The simulation proves the fold equals `applyAction`. It is evidence that the design works, not that it was the right choice among the options below.

### Neutral / Trade-offs

- Contract changes, all in this work order: `GameState` gains `acting`. `GameEvent`: `turnStarted.context` gains `"rollOff"`, `potTaken` gains `hand`, `rollOffStarted` gains `tiedOn`, and `potChanged{tieBreak}` now follows `tieBreakStarted`. `LoggedEvent` gains `beat`, the `seq` of the beat's first event. `SessionView.state` now means "as of the last released beat"; `SessionView` gains `rollMs`; `pending` stays for an online acknowledgement and is always false locally. `Speed` gains `"slow"`.
- A rule change rode along: the roll to start now goes in seat order (ENG-12), which gives every handover its own `turnStarted`. It is a game behaviour, recorded in `game-engine.md`, not a consequence of the fold.
- Cost to reverse: moderate, the same class as 0001. Today it is a wide, mechanical refactor across fixtures, stories and tests, with no persisted data and no deployed consumer. Once an online version ships, the events become a wire contract and events-as-source-of-truth becomes hard to undo.
- The session keeps the engine's state (`game`) beside the fold of released events (`Playback.shown`). That is not full event sourcing: the store keeps a state to validate the next action against, and the fold is what the screen shows.

## Alternatives Considered

### Option A: `applyAction` returns the state after each event

**Why considered:** It gives the session every in-between state with no public fold: `{ steps: [{ event, stateAfter }] }`.

**Why rejected:** It needs the same stored `acting` and the same per-event transition code as the chosen option, but keeps the fold private. A remote client would then need the server to ship a state with every event, or the final state plus a client-side rebuild it has no function for. Same engine work, smaller pay-off.

### Option B: The session keeps the previous state, and the view derives the in-between moments from released events

**Why considered:** It leaves the engine untouched. The view would be computed once, from the previous state plus the released events.

**Why rejected:** Deriving "the worst hand moved", "the pot doubled" or "nobody is acting" from events restates rules outside the engine, in exactly the place the requirements said they must not live. The rules would exist twice and could drift.

### Option C: Keep `acting` derived, with a "pending transition" marker in state

**Why considered:** It avoids a stored field next to `Turn.seat`.

**Why rejected:** The marker is a stored field under another name, and every selector would have to consult it. Storing `acting` directly is the smaller change, with one invariant to test.

### Option D: The engine splits actions, or returns beats

**Why considered:** The engine would hand the session pre-cut moments, one per call.

**Why rejected:** Rejected by the product owner. It also puts display grouping into the rules: what counts as one moment on screen is a presentation decision, and online it belongs to the client.
