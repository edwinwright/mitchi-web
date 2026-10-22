# Game engine

The rules engine behind the practice game at `/play`, and the contract between it and everything else. The code in `src/modules/game/engine/` is the detail; this file holds the rules that are invisible in it. For the module convention, see `modules.md`.

## What the engine is for

The engine is a reducer with a rulebook. Given a state and an action it decides whether the action is legal for that seat now, and if so returns the next state and the events that happened, in order. The state is the fold of those events: `applyEvent(state, event)` is public, and replaying an action's events onto the state before it gives exactly the state `applyAction` returned. Selectors derive read-only values from a state, and the bot policy is a pure function from a state to the next request. The engine does not roll dice, keep time, know who anyone is, store anything or render anything.

## Why it is built this way

The engine is pure and never rolls dice. `applyAction(state, action)` returns a result or a typed rejection, and the dice arrive inside the action. The same engine runs in the browser now and could run on a server later, where the server must roll for fairness. It also makes the seeded simulation and the scripted tests deterministic.

The alternatives and the trade-off are in `docs/architecture/decisions/0001-session-boundary.md`. Why state is a fold of events, and why the session plays them back one beat at a time, is in `docs/architecture/decisions/0002-events-are-the-unit-of-playback.md`.

The action and event types and the `GameSession` interface are the contract a future online version reuses. Change them deliberately: every fixture, story and commentary row depends on them.

Mitchi has no hidden information: every die is public. That is what keeps the session boundary cheap, because a server would broadcast the same events to every seat and need no per-seat redaction.

## Engine rules (ENG)

1. The engine is pure. It imports only its own files and `@/data/hands`. No React, Next, next-intl, `@/components`, `@/i18n`, `@/lib`, no sibling sub-module. No `Math.random`, timers, `Date`, `crypto`, `window` or `globalThis`. dependency-cruiser checks the imports, ESLint the globals.
2. The engine never rolls. Dice arrive in `roll.values`, exactly `diceToRoll(state)` of them.
3. State is plain JSON: `null`, never `undefined`. No `Map`, `Set`, `Date`, class or function. Arrays are fine in state; the "no arrays" rule is for message files.
4. `applyAction` never throws on bad input. It returns a typed rejection with the same state reference and no events. It throws only for a corrupt state.
5. Keep is engine state, one flag per die, set by `{ type: "keep", seat, die, kept }`. Never a toggle, never a parameter on `roll`. A kept die stays kept across rolls until the player un-keeps it; both flags reset to `false` only when a turn starts.
6. Rank is the index in `HANDS`. No second table, no comparator that restates the order. Index 0 is the best hand, so the worst hand has the highest rank.
7. Derived values (worst hand so far, rolls left) are selectors, never stored. The acting seat is stored (`acting`), because a state folded to the middle of an action needs "nobody yet": between a turn's end and the next turn's start, nobody is acting.
8. Bots are pure functions of state. A decision has at most one reason, on the `roll` or `stop` that completes it. A bot swapping the die it keeps lets go of the old one before keeping the new one, so it never holds both; the session applies the two keeps as one move.
9. Seats are numbers. No names, "you" or avatars in the engine. The UI compares against `view.viewerSeat`, never `0`.
10. Control actions (`newGame`, `nextRound`) carry no seat. Player actions do.
11. Dice stay in the slot they were rolled into. `DicePair` is positional: slot 0 is shown on the left, slot 1 on the right, and `die` in a keep action is a slot. Hand lookup reads the pair as higher die, then lower, and never writes that order back. Hand names read highest first. Wherever a hand is shown as two dice, it is drawn higher die first too; only the Keep buttons, one per slot, show the rolled order.
12. The roll to start goes in seat order, lowest first; a tie on the highest die re-rolls among the tied, lowest seat first. A roll from any other seat is `notYourTurn`. Rounds and tie-breaks are turn-based too.
13. State changes only through the fold. `applyAction` decides the events and folds each one with `applyEvent` as it goes; nothing in `apply.ts` assigns a state field. A new rule adds or changes an event, never a second way to build state. `applyEvent` throws only on an out-of-sequence event, a corrupt log.

## Session rules (SES)

1. `local/` is the only place that runs the engine, and the only place with `Math.random` and `setTimeout`. There is no exception: `ui/` has no timer, and any duration reaches it as `view.rollMs`. The initial store state is deterministic. Dice are generated in event handlers and timer callbacks and passed in the message.
2. `ui/` receives a `GameSession` and reads the engine through types and the `select` namespace. It never calls `applyAction` or the bots, and never imports `local/`. Only the `local/` import is checked; the rest is review.
3. Only `GameBoard` receives the `GameSession`. Panels take slices as props.
4. Nothing is written to the device: no `localStorage`, `sessionStorage` or cookies.
5. No transport, event bus, `RemoteSession` stub or optimistic update. The seams are the types.
6. `testing/` (fixtures, the simulation) is imported by tests and stories only. It is as pure as the engine.
7. `SessionView.state` is the state as of the last released beat, not the engine's final state while beats are queued. `SessionView.events` is the released log since the round started; round 1 also keeps the roll to start. The log empties on `gameStarted` and on `roundStarted` after round 1, when that beat is released. `seq` and `beat` are stamped when events are received, so `seq` is unique and strictly increasing for the whole session and carries on across the trims, and a consumer can key on it.
8. `SessionView.pending` is true while the viewer's own intent is unacknowledged. It is for an online session, which would hold it until the server answers; the local session always reports `false`. Locally, `allowed` is none until the view has caught up and the viewer's dice have landed (`rollMs`), so a click never lands between beats.

## What may import what

The rules are in `.dependency-cruiser.cjs`, each with a comment, and `npm run depcruise` checks them. In short: `engine/` imports nothing outside itself but `@/data/hands`; `local/` and `ui/` import the engine; `ui/` never imports `local/`; production code never imports `testing/`. The module-wide rules are in `modules.md`.

## Actions, rejections and events

```
Intent (session, no dice) ─▶ ActionRequest (no dice) ─▶ Action (dice supplied) ─▶ applyAction ─▶ result | rejection
  roll(), setKeep(), stop()    { type: "roll", seat }      { type: "roll", seat, values }
```

Whoever runs the engine calls `completeAction(state, request, spare, reason?)`, which takes exactly `diceToRoll(state)` dice from the spare pair. Locally the browser rolls; online a server would.

- **Actions:** `roll` (with `values`, `reason`), `keep` (`die`, `kept`), `stop` (`reason`), plus the seatless `newGame` and `nextRound`.
- **Rejections:** `unknownAction`, `unknownSeat`, `wrongPhase`, `notYourTurn`, `noDiceRolled`, `noRollsLeft`, `bothKept`, `wrongDiceCount`, `invalidDie`. The first failing check wins; the order is in `apply.ts`.
- **Events** are what happened, in order: game, roll to start, round, turn, roll, keep, roll limit, worst hand, pot, tie-break, pot taken, game ended. Each carries every field the fold needs, so a client that receives only events can rebuild the state. `turnStarted` is the last event of any step that hands a roll to a seat, in the roll to start, a round and a tie-break. A `keep` that sets a die to the flag it already has is accepted with the same state reference and no events.

The unions live in `engine/actions.ts` and `engine/events.ts`. They are the reviewed contract; read them there.

## Beats

A beat is one thing a player or the game does, with its consequences riding along: a turn end carries the roll limit, the pot and the worst hand so far in the same beat. The next player's turn starts on its own beat, so the screen never shows the previous player and the next at once.

- `beatsOf(events)` groups a received batch into beats, reading only the events, never time or the viewer. It never merges two batches. The rules are in `engine/beats.ts`; the ones a reader would not guess: `gameStarted` carries the roll to start's first turn (the Start click is the pause); `roundStarted` carries its starter's turn only after round 1 (in round 1 the winner of the roll to start is named on one beat and their turn starts on the next); a bot's un-keep and keep of the other die are one `keepSwapped` beat.
- `Playback` is the cursor: `receive` stamps and queues a batch, `release` folds the first queued beat into what is shown. Both are pure engine code. The session decides only when to release.
- The local session releases a viewer's intent's first beat at once (the click is the pause) and every other beat after `DELAY_MS` (Slow 2600, Normal 1800, Fast 400). A roll's animation, `ROLL_MS` (800, 500, 200), runs inside its beat and is always shorter than the delay. Pause holds beats, not an animation already under way; Step releases exactly one.
- The UI reads `view.state` and `select.lastBeat(view.events)`, so every panel shows the same beat. One hidden announcer, keyed by the beat id, is the page's only live region.

## Phase machine

```
notStarted ─newGame─▶ rollOff ─(unique highest)─▶ turn (round 1)
                        ▲ tied highest roll again, among themselves
turn ─(all finished, unique worst)─▶ take the pot ─▶ roundSummary ─nextRound─▶ turn (round n+1, taker starts)
turn ─(all finished, tied worst)──▶ tieBreak 1 ─(unique worst)─▶ take the pot
                                       └─(tied again)─▶ tieBreak n+1
take the pot: points += pot; if anyone is at the limit or over:
    ─▶ gameOver (winners: every seat on the fewest points; two or more is a draw)
gameOver ─newGame─▶ rollOff
```

A hand is not fixed until the turn ends. A Mitchi rolled mid-turn and re-rolled counts for nothing; the pot changes only when a turn ends on a Mitchi. A tie-break roll is a whole turn, so a Mitchi there adds 2 as it lands.

The roll limit is unset until the starter's turn ends. That turn is bounded by `MAX_ROLLS` (3); the limit then equals the rolls the starter used, and resets every round. A non-starter who reaches it is ended automatically (`noRollsLeft`), so at limit 1 they make no decisions. No one can keep or stop before rolling (`noDiceRolled`). A tie-break roll is a single roll: no keep, no stop.

## What `/rules` does not state

The engine implements every rule on `/rules`, plus two behaviours the page does not say. Each is a presentational default, chosen so the game can run. A `/rules` sentence for them is a later work order.

1. **Tie-break direction alternates, anticlockwise first.** A main round runs clockwise, so tie-break 1 runs anticlockwise, tie-break 2 clockwise, and so on. The order walks the table from the last roller in that direction, keeping only the tied seats.
2. **A tied best roll in the roll to start re-rolls among the tied.** Only the seats that tied on the highest die roll again.
3. **The roll to start goes in seat order.** Lowest seat first, so each roll has its own handover, as in a game against people.

## The role of `local/`

`local/` holds `LocalSession`, the browser implementation of `GameSession`: a React-free store that queues each action's events and releases them one beat at a time, the `useLocalSession` hook with the beat timer and the settle timer, the dice, the pacing tables, and the bots' driver, which applies a keep swap as one move. It fits in neither neighbour. It runs the reducer and the bots, so it cannot be in `ui/`. It uses React, timers and `Math.random`, so it cannot be in `engine/`. Naming it `local` leaves room for a `remote/` sub-module that an online version would add, returning the same `GameSession` shape.
