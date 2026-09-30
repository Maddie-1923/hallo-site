#!/usr/bin/env bash
# Runs the import and merge tests (src/lib/imports/__tests__), each a plain
# node:assert script, through tsx. Exits non-zero if any file has a failure.
# The TV Time sample tests look for ../kodigo-android/private/ or
# $TVTIME_SAMPLE and skip where the sample isn't.
set -u
cd "$(dirname "$0")/.."
status=0
for file in src/lib/imports/__tests__/*.test.ts; do
  echo "== $file"
  npx --yes tsx "$file" || status=1
done
exit $status
