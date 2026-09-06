#!/bin/bash
# Double-click to send the site's commits to GitHub.
#
# The push happens here rather than through Claude because the credentials
# live in this Mac's keychain, which the sandbox Claude works in can't reach.
cd "$(dirname "$0")" || exit 1

echo "Pushing $(git log --oneline -1)"
echo

git push origin HEAD
status=$?

if [ $status -ne 0 ]; then
  echo
  echo "That failed. The saved GitHub login is stale, so clearing it and"
  echo "asking again."
  echo
  printf 'protocol=https\nhost=github.com\n\n' | git credential-osxkeychain erase
  echo "Username: Maddie-1923"
  echo "Password: paste a GitHub personal access token (not your password)."
  echo "           github.com -> Settings -> Developer settings ->"
  echo "           Personal access tokens -> Tokens (classic) ->"
  echo "           Generate new token, tick 'repo', copy it."
  echo "Nothing appears as you paste the token. That is normal."
  echo
  git push origin HEAD
  status=$?
fi

echo
if [ $status -eq 0 ]; then
  echo "Done. Vercel will pick it up once the project is connected."
else
  echo "Still failing. Send Claude what it said."
fi
echo "Press any key to close."
read -n 1 -s
