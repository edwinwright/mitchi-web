#!/usr/bin/env bash
#
# Smoke tests for Mitchi site locale routing and HTML alternates.
#
# These check what a build cannot: request-time proxy behaviour (locale
# negotiation, cookie precedence, apex redirect) and that served HTML
# advertises the correct canonical and hreflang URLs.
#
# Usage:
#   ./scripts/smoke.sh                          # production
#   ./scripts/smoke.sh https://mitchi-web.vercel.app
#   ./scripts/smoke.sh http://localhost:3000    # after `npm run dev`
#
# HTML alternate checks need a build that includes Slice 2 metadata. Against
# production they fail until that ships; use localhost to verify earlier.
#
# Exits non-zero if any check fails, so it can go in CI later.

set -uo pipefail

PROD="https://www.mitchidice.com"
BASE="${1:-$PROD}"
BASE="${BASE%/}"

# Absolute URLs in <link rel="canonical|alternate"> come from metadataBase,
# not from $BASE. Fetch HTML from $BASE; assert href hosts against ORIGIN.
ORIGIN="https://www.mitchidice.com"

# Observed status codes. If a Next.js or next-intl upgrade changes these,
# fix them here: the location is the assertion that matters, the exact
# 3xx code is a library detail.
LOCALE_REDIRECT=307   # next-intl locale redirect
DOMAIN_REDIRECT=308   # Vercel apex -> www
RETIRED_REDIRECT=308  # next.config.ts redirects(), permanent: true

# Realistic browser headers. Region subtags and q-values matter: matching
# `es-ES` to the `es` locale is precisely the negotiation being tested.
ES='Accept-Language: es-ES,es;q=0.9,en;q=0.8'
PL='Accept-Language: pl-PL,pl;q=0.9,en;q=0.8'
EN='Accept-Language: en-GB,en;q=0.9'

FAILS=0

# probe <url> [curl args...] -> "STATUS|LOCATION"
# No redirects followed and no cookie jar, so every call is a first visit.
probe() {
  local url="$1"; shift
  curl -sS -o /dev/null -D - "$@" "$url" 2>/dev/null | awk '
    BEGIN { IGNORECASE = 1 }
    /^HTTP\//     { status = $2 }
    /^location:/  { loc = $2 }
    END {
      gsub(/\r/, "", status); gsub(/\r/, "", loc)
      printf "%s|%s", status, loc
    }'
}

expect() {
  local desc="$1" want="$2" got="$3"
  if [[ "$got" == "$want" ]]; then
    printf '  ok    %s\n' "$desc"
  else
    printf '  FAIL  %s\n          want: %s\n          got:  %s\n' "$desc" "$want" "$got"
    FAILS=$((FAILS + 1))
  fi
}

# fetch_html <url> [curl args...] -> body
fetch_html() {
  local url="$1"; shift
  curl -sS "$@" "$url" 2>/dev/null || true
}

# html_link_has <html> <rel> <href> -> "yes"|"no"
# Matches either attribute order on one <link> tag. Case-insensitive on
# hreflang/hrefLang so a Next render change does not flake the smoke.
html_link_has() {
  local html="$1" rel="$2" href="$3"
  if printf '%s' "$html" | tr '\n' ' ' | grep -Eiq \
    "<link[^>]*rel=\"${rel}\"[^>]*href=\"${href}\"|<link[^>]*href=\"${href}\"[^>]*rel=\"${rel}\""; then
    printf 'yes'
  else
    printf 'no'
  fi
}

# html_hreflang_has <html> <lang> <href> -> "yes"|"no"
html_hreflang_has() {
  local html="$1" lang="$2" href="$3"
  if printf '%s' "$html" | tr '\n' ' ' | grep -Eiq \
    "<link[^>]*hreflang=\"${lang}\"[^>]*href=\"${href}\"|<link[^>]*href=\"${href}\"[^>]*hreflang=\"${lang}\""; then
    printf 'yes'
  else
    printf 'no'
  fi
}

# html_lacks <html> <needle> -> "yes"|"no"  (yes = needle absent)
html_lacks() {
  local html="$1" needle="$2"
  if printf '%s' "$html" | grep -Fq -- "$needle"; then
    printf 'no'
  else
    printf 'yes'
  fi
}

printf 'Smoke tests against %s\n\n' "$BASE"

expect "English speaker gets the root, no redirect" \
  "200|" \
  "$(probe "$BASE/" -H "$EN")"

expect "Spanish speaker is redirected to /es" \
  "${LOCALE_REDIRECT}|/es" \
  "$(probe "$BASE/" -H "$ES")"

expect "NEXT_LOCALE cookie beats the Accept-Language header" \
  "${LOCALE_REDIRECT}|/es" \
  "$(probe "$BASE/" -H "$EN" -H 'Cookie: NEXT_LOCALE=es')"

expect "/es serves the Spanish page" \
  "200|" \
  "$(probe "$BASE/es" -H "$EN")"

expect "localised Spanish rules slug serves" \
  "200|" \
  "$(probe "$BASE/es/reglas" -H "$EN")"

expect "switcher English prefix strips to unprefixed path" \
  "${LOCALE_REDIRECT}|/reference" \
  "$(probe "$BASE/en/reference" -H "$EN")"

expect "NEXT_LOCALE rewrites an English path to the Spanish slug" \
  "${LOCALE_REDIRECT}|/es/reglas" \
  "$(probe "$BASE/rules" -H "$EN" -H 'Cookie: NEXT_LOCALE=es')"

expect "old Spanish rules slug redirects to localised slug" \
  "${LOCALE_REDIRECT}|/es/reglas" \
  "$(probe "$BASE/es/rules" -H "$EN")"

# Polish (WO-0014). Same four shapes as Spanish; hreflang blocks for
# /pl/zasady are added once the page carries real metadata.
expect "Polish speaker is redirected to /pl" \
  "${LOCALE_REDIRECT}|/pl" \
  "$(probe "$BASE/" -H "$PL")"

expect "localised Polish rules slug serves" \
  "200|" \
  "$(probe "$BASE/pl/zasady" -H "$EN")"

expect "NEXT_LOCALE rewrites an English path to the Polish slug" \
  "${LOCALE_REDIRECT}|/pl/zasady" \
  "$(probe "$BASE/rules" -H "$EN" -H 'Cookie: NEXT_LOCALE=pl')"

expect "old Polish rules slug redirects to localised slug" \
  "${LOCALE_REDIRECT}|/pl/zasady" \
  "$(probe "$BASE/pl/rules" -H "$EN")"

# Retired pages (WO-0013). The redirect runs before the proxy, so the
# source is the external path and the fragment rides in Location.
# /es/acerca-de below is hand-typed (bash can't import next.config.ts's
# routing.ts import): if src/i18n/routing.ts's "/about".es slug changes,
# update it here too.
expect "/speak redirects to /about" \
  "${RETIRED_REDIRECT}|/about" \
  "$(probe "$BASE/speak" -H "$EN")"

expect "/es/speak redirects to /es/acerca-de" \
  "${RETIRED_REDIRECT}|/es/acerca-de" \
  "$(probe "$BASE/es/speak" -H "$EN")"

# Domain-level checks only make sense against production.
if [[ "$BASE" == "$PROD" ]]; then
  expect "apex redirects to www" \
    "${DOMAIN_REDIRECT}|${PROD}/" \
    "$(probe "https://mitchidice.com/" -H "$EN")"
fi

# Per-locale title/description are covered by view-source during the slice.
# These assert the Slice 2 contract: canonical + hreflang on 200 URLs only.
RULES_HTML="$(fetch_html "$BASE/rules" -H "$EN")"
REGLAS_HTML="$(fetch_html "$BASE/es/reglas" -H "$EN")"
ZASADY_HTML="$(fetch_html "$BASE/pl/zasady" -H "$EN")"

expect "/rules has rel=canonical for unprefixed English URL" \
  "yes" \
  "$(html_link_has "$RULES_HTML" "canonical" "${ORIGIN}/rules")"

expect "/rules hreflang=en points at /rules" \
  "yes" \
  "$(html_hreflang_has "$RULES_HTML" "en" "${ORIGIN}/rules")"

expect "/rules hreflang=es points at /es/reglas" \
  "yes" \
  "$(html_hreflang_has "$RULES_HTML" "es" "${ORIGIN}/es/reglas")"

expect "/rules hreflang=pl points at /pl/zasady" \
  "yes" \
  "$(html_hreflang_has "$RULES_HTML" "pl" "${ORIGIN}/pl/zasady")"

expect "/rules hreflang=x-default points at /rules" \
  "yes" \
  "$(html_hreflang_has "$RULES_HTML" "x-default" "${ORIGIN}/rules")"

expect "/rules never advertises /en/rules" \
  "yes" \
  "$(html_lacks "$RULES_HTML" "${ORIGIN}/en/rules")"

expect "/es/reglas has rel=canonical for Spanish URL" \
  "yes" \
  "$(html_link_has "$REGLAS_HTML" "canonical" "${ORIGIN}/es/reglas")"

expect "/es/reglas hreflang=en points at /rules" \
  "yes" \
  "$(html_hreflang_has "$REGLAS_HTML" "en" "${ORIGIN}/rules")"

expect "/es/reglas hreflang=es points at /es/reglas" \
  "yes" \
  "$(html_hreflang_has "$REGLAS_HTML" "es" "${ORIGIN}/es/reglas")"

expect "/es/reglas hreflang=pl points at /pl/zasady" \
  "yes" \
  "$(html_hreflang_has "$REGLAS_HTML" "pl" "${ORIGIN}/pl/zasady")"

expect "/es/reglas hreflang=x-default points at /rules" \
  "yes" \
  "$(html_hreflang_has "$REGLAS_HTML" "x-default" "${ORIGIN}/rules")"

expect "/es/reglas never advertises /en/rules" \
  "yes" \
  "$(html_lacks "$REGLAS_HTML" "${ORIGIN}/en/rules")"

expect "/pl/zasady has rel=canonical for Polish URL" \
  "yes" \
  "$(html_link_has "$ZASADY_HTML" "canonical" "${ORIGIN}/pl/zasady")"

expect "/pl/zasady hreflang=en points at /rules" \
  "yes" \
  "$(html_hreflang_has "$ZASADY_HTML" "en" "${ORIGIN}/rules")"

expect "/pl/zasady hreflang=es points at /es/reglas" \
  "yes" \
  "$(html_hreflang_has "$ZASADY_HTML" "es" "${ORIGIN}/es/reglas")"

expect "/pl/zasady hreflang=pl points at /pl/zasady" \
  "yes" \
  "$(html_hreflang_has "$ZASADY_HTML" "pl" "${ORIGIN}/pl/zasady")"

expect "/pl/zasady hreflang=x-default points at /rules" \
  "yes" \
  "$(html_hreflang_has "$ZASADY_HTML" "x-default" "${ORIGIN}/rules")"

expect "/pl/zasady never advertises /en/rules" \
  "yes" \
  "$(html_lacks "$ZASADY_HTML" "${ORIGIN}/en/rules")"

# Practice game (WO-0016). /es/jugar and /pl/zagraj are hand-typed because
# bash cannot read routing.ts: if the "/play" slugs there change, update them
# here too.
expect "localised Spanish play slug serves" \
  "200|" \
  "$(probe "$BASE/es/jugar" -H "$EN")"

expect "localised Polish play slug serves" \
  "200|" \
  "$(probe "$BASE/pl/zagraj" -H "$EN")"

expect "NEXT_LOCALE rewrites /play to the Spanish slug" \
  "${LOCALE_REDIRECT}|/es/jugar" \
  "$(probe "$BASE/play" -H "$EN" -H 'Cookie: NEXT_LOCALE=es')"

expect "NEXT_LOCALE rewrites /play to the Polish slug" \
  "${LOCALE_REDIRECT}|/pl/zagraj" \
  "$(probe "$BASE/play" -H "$EN" -H 'Cookie: NEXT_LOCALE=pl')"

expect "old Spanish play slug redirects to localised slug" \
  "${LOCALE_REDIRECT}|/es/jugar" \
  "$(probe "$BASE/es/play" -H "$EN")"

expect "old Polish play slug redirects to localised slug" \
  "${LOCALE_REDIRECT}|/pl/zagraj" \
  "$(probe "$BASE/pl/play" -H "$EN")"

PLAY_HTML="$(fetch_html "$BASE/play" -H "$EN")"
JUGAR_HTML="$(fetch_html "$BASE/es/jugar" -H "$EN")"
ZAGRAJ_HTML="$(fetch_html "$BASE/pl/zagraj" -H "$EN")"

for page in "play:$PLAY_HTML:/play" "jugar:$JUGAR_HTML:/es/jugar" "zagraj:$ZAGRAJ_HTML:/pl/zagraj"; do
  name="${page%%:*}"; rest="${page#*:}"
  html="${rest%:*}"; path="${rest##*:}"
  expect "$path has rel=canonical for its own URL" \
    "yes" \
    "$(html_link_has "$html" "canonical" "${ORIGIN}${path}")"
  expect "$path hreflang=en points at /play" \
    "yes" \
    "$(html_hreflang_has "$html" "en" "${ORIGIN}/play")"
  expect "$path hreflang=es points at /es/jugar" \
    "yes" \
    "$(html_hreflang_has "$html" "es" "${ORIGIN}/es/jugar")"
  expect "$path hreflang=pl points at /pl/zagraj" \
    "yes" \
    "$(html_hreflang_has "$html" "pl" "${ORIGIN}/pl/zagraj")"
  expect "$path hreflang=x-default points at /play" \
    "yes" \
    "$(html_hreflang_has "$html" "x-default" "${ORIGIN}/play")"
  expect "$path never advertises /en/play" \
    "yes" \
    "$(html_lacks "$html" "${ORIGIN}/en/play")"
done

echo
if (( FAILS > 0 )); then
  printf '%d failed\n' "$FAILS"
  exit 1
fi
echo "all passed"
