#!/bin/bash
# Round 11: Lighthouse, mobile, 3 runs per page, median Performance. Against a local `next start` on port 3100.
#   bash scripts/round-11/lighthouse.sh <label> [base]
# Writes reports/round-11/lighthouse-<label>.txt
set -u
LABEL=$1; BASE=${2:-http://localhost:3100}
LH=$(ls -d /Users/zurcohen/.npm/_npx/*/node_modules/.bin/lighthouse | head -1)
CP=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium-*/chrome-mac*/"Google Chrome for Testing.app"/Contents/MacOS/"Google Chrome for Testing" 2>/dev/null | sort -r | head -1)
[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ] && CP="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
export CHROME_PATH="$CP"
OUT=$(cd "$(dirname "$0")/../.." && pwd)/reports/round-11/lighthouse-$LABEL.txt
TMP=$(mktemp -d)
: > "$OUT"
for page in "/" "/wizard"; do
  scores=()
  for i in 1 2 3; do
    "$LH" "$BASE$page" --form-factor=mobile --quiet --output=json --output-path="$TMP/r.json" --chrome-flags="--headless=new" --only-categories=performance,accessibility >/dev/null 2>&1
    s=$(node -e "const r=require('$TMP/r.json');const a=r.audits;console.log([Math.round(r.categories.performance.score*100),Math.round(r.categories.accessibility.score*100),(a['largest-contentful-paint'].numericValue/1000).toFixed(2),Math.round(a['total-blocking-time'].numericValue),a['cumulative-layout-shift'].numericValue.toFixed(3)].join(' '))")
    scores+=("$s")
  done
  med=$(printf '%s\n' "${scores[@]}" | sort -n | sed -n 2p)
  echo "$page perf a11y lcp_s tbt_ms cls | runs: ${scores[*]} | median: $med" | tee -a "$OUT"
done
