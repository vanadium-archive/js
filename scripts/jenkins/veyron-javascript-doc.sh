#!/bin/bash

set -e

readonly DOCDIR="/var/www/jsdoc"
export TMPDIR="/var/veyron/tmp/veyron-javascript-doc"
mkdir -p "${TMPDIR}"

readonly REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "${REPO_ROOT}" && ./vgrunt jsdoc
rm -rf "${DOCDIR}"
mv "${REPO_ROOT}/docs" "${DOCDIR}"
