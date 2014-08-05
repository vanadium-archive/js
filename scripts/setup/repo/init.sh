#!/bin/bash

if [[ -z "$VEYRON_ROOT" ]]; then
  echo "No VEYRON_ROOT found!"
  echo "Please set VEYRON_ROOT to the location of the veyron project root and re-run."
  exit 1
fi

source "${VEYRON_ROOT}/environment/scripts/setup/repo/init.sh"
