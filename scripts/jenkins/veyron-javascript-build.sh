#!/bin/bash

set -e

export TMPDIR=/var/veyron/tmp/veyron-javascript-build
mkdir -p "${TMPDIR}"

readonly REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "${REPO_ROOT}" && ./vgrunt build
