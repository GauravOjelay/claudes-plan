#!/usr/bin/env bash
# Downloads the raw IMF DataMapper series the baseline needs into data/raw/imf/.
# Run once before the hackathon, then `node scripts/snapshot.ts`. The game never calls the network.
# Uses plain curl on purpose: the IMF's edge blocks custom or script user agents, so we do not set one.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=data/raw/imf
mkdir -p "$OUT"
PERIODS=2024,2025,2026,2027,2028,2029,2030
BASE=https://www.imf.org/external/datamapper/api/v1
for IND in NGDPD LP LUR; do
  curl -fsS --max-time 60 "$BASE/$IND?periods=$PERIODS" -o "$OUT/$IND.json"
  echo "fetched $IND ($(wc -c < "$OUT/$IND.json") bytes)"
done
curl -fsS --max-time 60 "$BASE/indicators" -o "$OUT/indicators.json"
date -u +%Y-%m-%d > "$OUT/retrieved.txt"
echo "retrieved $(cat "$OUT/retrieved.txt")"
