#!/bin/bash

# This file exists so that developers can find and execute tests without a
# deep knowledge of the architecture or test runners used in this repo.
# This will help determine if this library has been impacted by changes made
# to dependent Veyron services (mountabled, identityd, etc.).
#
# Example:
#
#     find . -name 'test.sh' -exec \{\} \;
#
source "${VEYRON_ROOT}/scripts/lib/run.sh"

run ./vgrunt
