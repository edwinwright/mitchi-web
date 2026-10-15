#!/usr/bin/env bash
#
# Ignored Build Step for the mitchi-storybook Vercel project.
#
# Dashboard: Settings → Build and Deployment → Ignored Build Step
#   Behavior: Run my Bash script
#   Script:   scripts/vercel-ignore-storybook.sh
#
# Exit 0 skips the build. Exit 1 builds.
#
# Builds when the last successful deploy of this project on this branch
# differs in anything Storybook reads. next.config.ts is included because
# the Vite framework loads it. The script is included so a change to this
# list itself redeploys the workshop.
#
# VERCEL_GIT_PREVIOUS_SHA is that last successful deploy. It is empty on
# the first deploy of a branch. A missing base builds: skipping would
# drop a commit this comparison cannot see.

set -uo pipefail

paths=(
  .storybook
  src
  messages
  public
  package.json
  package-lock.json
  next.config.ts
  postcss.config.mjs
  tsconfig.json
  global.d.ts
  scripts/vercel-ignore-storybook.sh
)

base="${VERCEL_GIT_PREVIOUS_SHA:-}"

if [[ -z "$base" ]]; then
  echo "mitchi-storybook: no previous deploy; building"
  exit 1
fi

if ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  echo "mitchi-storybook: previous deploy ${base} is not in this checkout; building"
  exit 1
fi

git diff --quiet "$base" HEAD -- "${paths[@]}"
status=$?

if [[ "$status" -eq 0 ]]; then
  echo "mitchi-storybook: no changes since ${base}; skipping build"
  exit 0
fi

echo "mitchi-storybook: changes since ${base}; building"
exit 1
