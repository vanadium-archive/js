#
# This Makefile is used to build and test Veyron JavaScript API.
# It delegates all calls to Grunt.
#

# Add node to path
PATH:=$(PATH):$(VEYRON_ENV)/cout/node/bin

NPM=$(VEYRON_ENV)/cout/node/bin/npm
GRUNT= ./node_modules/.bin/grunt

# Builds and tests everything
default: setup
	$(GRUNT)

# Builds
build: setup
	$(GRUNT) build

# Builds and runs all automated tests
test: setup
	$(GRUNT) test

# Runs a HTTP server and opens the test reporters in the browser for debugging
debug: setup
	$(GRUNT) debug

# Runs the tests outputting xml test results that jenkins can understand
# Four files are outputted in dist/test. One for each combination of (specs, integration)*(nodeJS, browser)
jenkins: setup
	$(GRUNT) jenkins --force

# Removes all build and testing artifacts
clean:
	rm -rf ./node_modules && rm -rf dist && rm -rf .tmp && rm -rf logs

# Ensures NodeJS is installed.
# Pulls server-side (NPM) dependencies from the repositories.
setup: check_node
	$(NPM) install

# Is NodeJS installed?
check_node:
	@if [[ ! -e $(VEYRON_ENV)/cout/node/bin ]]; then \
		echo "You don't have NodeJS installed. Please sync and rerun veyron/dev/install/init.sh"; \
		exit 1; \
	fi

