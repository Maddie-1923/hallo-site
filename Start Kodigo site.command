#!/bin/bash
# Double-click me. Starts the Kodigo site at http://localhost:3000 and opens it.
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js isn't installed. Get it from https://nodejs.org and run me again."
  read -n 1 -s -r -p "Press any key to close."; exit 1
fi
[ -d node_modules ] || npm install
( sleep 4; open "http://localhost:3000/discover" ) &
npm run dev
