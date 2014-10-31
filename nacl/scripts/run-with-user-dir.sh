#!/bin/bash
export CHROME_USER_DIR="$(mktemp -u -d)"
trap "rm -r ${CHROME_USER_DIR}" TERM
PATH="${VEYRON_ROOT}/veyron.js/nacl/scripts:${PATH}" "$@"