#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
git config --local core.hooksPath .githooks
printf 'SymSvel BO: pre-commit formatter enabled.\n'
