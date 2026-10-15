#!/usr/bin/env bash
#
# Ignored Build Step for the mitchi-web Vercel project.
#
# Dashboard: Settings → Build and Deployment → Ignored Build Step
#   Behavior: Run my Bash script
#   Script:   scripts/vercel-ignore-site.sh
#
# Exit 0 skips the build. Exit 1 builds.
#
# Skips when the last successful deploy differs only under .storybook/
# or in *.stories.tsx. Any other change builds the site. A wrong skip
# on production costs more than a spare build, so a missing base builds.
#
# VERCEL_GIT_PREVIOUS_SHA is that last successful deploy. It is empty on
# the first deploy of a branch.

set -uo pipefail

base="${VERCEL_GIT_PREVIOUS_SHA:-}"

if [[ -z "$base" ]]; then
  echo "mitchi-web: no previous deploy; building"
  exit 1
fi

if ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  echo "mitchi-web: previous deploy ${base} is not in this checkout; building"
  exit 1
fi

git diff --quiet "$base" HEAD -- . ':(exclude).storybook' ':(exclude,glob)**/*.stories.tsx'
status=$?

if [[ "$status" -eq 0 ]]; then
  echo "mitchi-web: no changes since ${base}; skipping build"
  exit 0
fi

echo "mitchi-web: changes since ${base}; building"
exit 1
