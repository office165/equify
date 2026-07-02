#!/bin/sh
# Blocks manual currency sign concatenation in bridge / results React render paths.
set -e

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERN='−\{|−\$\{|>\s*−\s*\{|>\s*-\s*\{'
PATHS="
components/wizard/equify
components/results
"

violations=""
for dir in $PATHS; do
  [ -d "$dir" ] || continue
  hits=$(rg -n "$PATTERN" "$dir" --glob '*.tsx' 2>/dev/null || true)
  if [ -n "$hits" ]; then
    violations="$violations$hits
"
  fi
done

if [ -n "$violations" ]; then
  echo "✗ Manual currency sign concatenation is banned in bridge React render paths."
  echo "  Route net-debt display through lib/format/currency.ts (formatNetDebtLine)."
  echo "$violations"
  exit 1
fi

echo "✓ No manual currency sign concatenation in bridge React render paths."
