#!/bin/bash
# Round 11: runs a command with every variable of .env and .env.local set to empty, so a local `next build` or `next start`
# never reaches the real Monday, Supabase or database (Next does not load a variable from a file when it is already set).
#   bash scripts/round-11/safe-env.sh npx next start -p 3100
cd "$(dirname "$0")/../.."
vars=$(cat .env .env.local .env.production .env.production.local 2>/dev/null | grep -oE '^[A-Za-z_][A-Za-z0-9_]*' | sort -u)
for v in $vars; do export "$v="; done
exec "$@"
