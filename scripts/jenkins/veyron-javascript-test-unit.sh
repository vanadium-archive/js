#!/bin/bash

set -e

readonly OUTDIR="/var/www/jscov/unit"
export TMPDIR=/var/veyron/tmp/veyron-javascript-test-unit
mkdir -p "${TMPDIR}"

readonly REPO_ROOT="$(git rev-parse --show-toplevel)"
"${VEYRON_ROOT}/veyron/scripts/build/go" install veyron/... veyron2/...
cd "${REPO_ROOT}"
xvfb-run -a -s "-screen -0 800x600x24" ./vgrunt jenkins_tests --tests unit

rm -rf "${OUTDIR}"
cp -r "${REPO_ROOT}/dist/test/coverage/unit" "${OUTDIR}"
