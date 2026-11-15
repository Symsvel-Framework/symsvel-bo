#!/bin/sh
# Format only staged files supported by Prettier, then re-stage them.
set -eu
cd "$(git rev-parse --show-toplevel)"
git diff --cached --name-only -z --diff-filter=ACMR |
while IFS= read -r -d '' file; do
  case "$file" in
    *.ts|*.tsx|*.js|*.jsx|*.svelte|*.json|*.css|*.md|*.html|*.yaml|*.yml)
      if [ -f "$file" ]; then
        ./node_modules/.bin/prettier --write -- "$file"
        git add -- "$file"
      fi
      ;;
  esac
done
