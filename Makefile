PATH := node_modules/.bin:${VEYRON_ROOT}/environment/cout/node/bin:$(PATH)
SHELL := /bin/bash -e -o pipefail

.DEFAULT_GOAL := all

UNAME := $(shell uname)
BROWSER := chrome

# For browser testing non Darwin machines get the --headless flag, this uses
# xvfb underneath the hood (inside prova => launch-browser => node-headless).
# Unfortunately OS X can't do the headless thing...
#
# SEE: https://github.com/kesla/node-headless/
ifneq ($(UNAME),Darwin)
	HEADLESS := --headless
endif

ifdef TAP
	TAP := --tap
endif

BROWSER_OPTS := --browser --launch $(BROWSER) $(HEADLESS) $(TAP) --quit

JS_SRC_FILES = $(shell find src -name "*.js")

JS_INTEGRATION_TESTS = test/test_helper.js
JS_INTEGRATION_TESTS += test/integration/proxy/*.js
JS_INTEGRATION_TESTS += test/integration/security/*.js
JS_INTEGRATION_TESTS += test/integration/server/*.js

all: build

build: dist/veyron.js dist/veyron.min.js

dist/veyron.js: src/veyron.js $(JS_SRC_FILES) | node_modules
	browserify $< --debug --outfile $@

dist/veyron.min.js: src/veyron.js $(JS_SRC_FILES) | node_modules
	browserify $< --debug --plugin [ minifyify --map dist/veyron.js.map --output $@.map ] --outfile $@

test_out:
	mkdir -p test_out

test_out/veyron.test.integration.js: $(JS_INTEGRATION_TESTS) | $(JS_SRC_FILES) test_out node_modules
	browserify $^ --debug --outfile $@

# NOTE(sadovsky): Switching to "jshint ." reveals tons of real lint errors.
lint: node_modules
	jshint src/ test/

dependency-check: node_modules
	dependency-check package.json --entry src/veyron.js

test: lint dependency-check test_out/veyron.test.integration.js
	./vgrunt

test-new: test-unit test-integration

test-unit: node_modules
	prova test/unit/test-*.js $(TAP)
	prova test/unit/test-*.js $(BROWSER_OPTS)

test-integration: node_modules
	node test/integration/runner.js test/integration/test-*.js $(TAP)
	node test/integration/runner.js test/integration/test-*.js $(BROWSER_OPTS)

clean:
	@$(RM) -fr docs/*
	@$(RM) -fr logs/*
	@$(RM) -fr test_out/*
	@$(RM) -fr tmp
	@$(RM) -fr node_modules
	@$(RM) -fr npm-debug.log

docs: $(JS_SRC_FILES) | node_modules
	jsdoc $^ --template node_modules/ink-docstrap/template --destination $@

node_modules: package.json
	@npm prune
	@npm install
	@touch node_modules

.PHONY: all build clean dependency-check lint
.PHONY: test test-new test-unit test-integration
