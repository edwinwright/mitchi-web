---
name: run-slice
description: Run one slice of the in-progress work order's PLAN.md, delegating each task to the slice-worker agent in order, then running the slice's Check and stopping. Only when the author types /run-slice.
argument-hint: <slice number>
disable-model-invocation: true
---

Run slice $ARGUMENTS of the work order in progress, exactly as the plan's **How to run this** section says, with one difference: each task is done by a `slice-worker` subagent instead of by you. You are the orchestrator. You read, brief, check, and stop. You do not write feature code yourself.

## 1. Find and check the slice

1. Find the work order in progress under `.work/` and read its `PLAN.md` in full: How to run, Context, and slice $ARGUMENTS. If there is no slice $ARGUMENTS, or more than one work order is in progress, stop and say so.
2. If an earlier slice still has unticked tasks or a failing Check, stop and name it. Do not start this one.
3. Run `git status`. If there are uncommitted changes from an earlier slice (a `review: stop` slice the author has not committed yet), stop and say so.

## 2. One worker per task, in order

For each unticked task in the slice, in order, one at a time (never in parallel: later tasks build on earlier ones):

1. Write the worker a brief containing:
   - the slice goal and the task, verbatim;
   - the slice's Files and Do not touch lists, verbatim;
   - the acceptance criteria and named tests this task serves, verbatim;
   - the paths of anything it must read (Context links, the tech spec section, an existing file to follow);
   - one line on what earlier tasks in this slice already did;
   - the narrow verify command for this task.
2. Spawn `slice-worker` with that brief and wait for its report.
3. **Done:** tick the task in `PLAN.md` and continue. **Blocked:** stop the slice and report the worker's Notes. Do not retry with a different approach and do not do the task yourself.

## 3. Check

Run the slice's **Check** commands yourself, in order, exactly as written.

- **Passes:** go to 4.
- **Fails:** spawn one `slice-worker` with the failing command, its output and the slice's Files list, to fix it, then run the Check again. **Fails a second time:** stop and report what you ran, what failed and what was tried (How to run, rule 2).

## 4. Stop

Follow the slice's review mode, then stop. Never start the next slice: one slice per `/run-slice`.

- `review: stop`: do not commit or stage. Show `git diff` and `git status`, say which slice is next, and wait.
- `review: continue`: commit as the plan's How to run says (`WO-NNNN slice N: <goal>`), show the commit, say which slice is next, and stop.

If this was the last slice, do what How to run says for the last slice (tick `build` in `work-order.md`, set `status: built`), then suggest the code review once for the whole work order.

## Never

- Write or edit feature code yourself, apart from ticking tasks in `PLAN.md`.
- Skip a task, reorder tasks, or add one that is not in the plan.
- Change `CLAUDE.md`, the tech spec or the requirements.
- Install a dependency the plan does not name.
