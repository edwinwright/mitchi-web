# Game engine

The rules engine behind the practice game at `/play`, and the contract between it and everything else. The code in `src/modules/game/engine/` is the detail; this file holds the rules that are invisible in it. For the module convention, see `modules.md`.

## What the engine is for

The engine is a reducer with a rulebook. Given a state and an action it decides whether the action is legal for that seat now, and if so returns the next state and the events that happened, in order. Selectors derive read-only values from a state, and the bot policy is a pure function from a state to the next request. The engine does not roll dice, keep time, know who anyone is, store anything or render anything.

## Why it is built this way

The engine is pure and never rolls dice. `applyAction(state, action)` returns a result or a typed rejection, and the dice arrive inside the action. The same engine runs in the browser now and could run on a server later, where the server must roll for fairness. It also makes the seeded simulation and the scripted tests deterministic.

The action and event types and the `GameSession` interface are the contract a future online version reuses. Change them deliberately: every fixture, story and commentary row depends on them.

## Engine rules (ENG)

1. The engine is pure. It imports only its own files and `@/data/hands`. No React, Next, next-intl, `@/components`, `@/i18n`, `@/lib`, no sibling sub-module. No `Math.random`, timers, `Date`, `crypto`, `window` or `globalThis`. dependency-cruiser checks the imports, ESLint the globals.
2. The engine never rolls. Dice arrive in `roll.values`, exactly `diceToRoll(state)` of them.
3. State is plain JSON: `null`, never `undefined`. No `Map`, `Set`, `Date`, class or function. Arrays are fine in state; the "no arrays" rule is for message files.
4. `applyAction` never throws on bad input. It returns a typed rejection with the same state reference and no events. It throws only for a corrupt state.
5. Keep is engine state, one flag per die, set by `{ type: "keep", seat, die, kept }`. Never a toggle, never a parameter on `roll`. A kept die stays kept across rolls until the player un-keeps it; both flags reset to `false` only when a turn starts.
6. Rank is the index in `HANDS`. No second table, no comparator that restates the order. Index 0 is the best hand, so the worst hand has the highest rank.
7. Derived values (worst hand so far, rolls left, acting seat) are selectors, never stored.
8. Bots are pure functions of state. A decision has at most one reason, on the `roll` or `stop` that completes it.
9. Seats are numbers. No names, "you" or avatars in the engine. The UI compares against `view.viewerSeat`, never `0`.
10. Control actions (`newGame`, `nextRound`) carry no seat. Player actions do.
11. Dice stay in the slot they were rolled into. `DicePair` is positional: slot 0 is shown on the left, slot 1 on the right, and `die` in a keep action is a slot. Hand lookup reads the pair as higher die, then lower, and never writes that order back. Hand names read highest first. Wherever a hand is shown as two dice, it is drawn higher die first too; only the Keep buttons, one per slot, show the rolled order.

## Session rules (SES)

1. `local/` is the only place that runs the engine, and the only place with `Math.random` and `setTimeout`. The initial store state is deterministic. Dice are generated in event handlers and timer callbacks and passed in the message.
2. `ui/` receives a `GameSession` and reads the engine through types and the `select` namespace. It never calls `applyAction` or the bots, and never imports `local/`. Only the `local/` import is checked; the rest is review.
3. Only `GameBoard` receives the `GameSession`. Panels take slices as props.
4. Nothing is written to the device: no `localStorage`, `sessionStorage` or cookies.
5. No transport, event bus, `RemoteSession` stub or optimistic update. The seams are the types.
6. `testing/` (fixtures, the simulation) is imported by tests and stories only. It is as pure as the engine.

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
- **Events** are what happened, in order, for the commentary and the log: game, roll-off, round, turn, roll, keep, roll limit, worst hand, pot, tie-break, pot taken, game ended. A `keep` that sets a die to the flag it already has is accepted with the same state reference and no events.

The unions live in `engine/actions.ts` and `engine/events.ts`. They are the reviewed contract; read them there.

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

## What `/rules` does not state

The engine implements every rule on `/rules`, plus two behaviours the page does not say. Each is a presentational default, chosen so the game can run. A `/rules` sentence for them is a later work order.

1. **Tie-break direction alternates, anticlockwise first.** A main round runs clockwise, so tie-break 1 runs anticlockwise, tie-break 2 clockwise, and so on. The order walks the table from the last roller in that direction, keeping only the tied seats.
2. **A tied best roll in the roll-off re-rolls among the tied.** Only the seats that tied on the highest die roll again.

## The role of `local/`

`local/` holds `LocalSession`, the browser implementation of `GameSession`: a React-free store, the `useLocalSession` hook, dice, pacing and the roll lock. It fits in neither neighbour. It runs the reducer and the bots, so it cannot be in `ui/`. It uses React, timers and `Math.random`, so it cannot be in `engine/`. Naming it `local` leaves room for a `remote/` sub-module that an online version would add, returning the same `GameSession` shape.
