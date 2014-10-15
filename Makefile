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

all: build

build: dist/veyron.js dist/veyron.min.js

dist/veyron.js: src/veyron.js $(JS_SRC_FILES) | node_modules
	browserify $< --debug --outfile $@

dist/veyron.min.js: src/veyron.js $(JS_SRC_FILES) | node_modules
	browserify $< --debug --plugin [ minifyify --map dist/veyron.js.map --output $@.map ] --outfile $@

lint: node_modules
	jshint .

dependency-check: node_modules
	dependency-check package.json --entry src/veyron.js

test: lint dependency-check test-unit test-integration

test-unit: lint test-unit-node test-unit-browser

test-unit-node: node_modules
	prova test/unit/test-*.js $(TAP)

test-unit-browser: node_modules
	prova test/unit/test-*.js $(BROWSER_OPTS)

test-integration: lint test-integration-node test-integration-browser

test-integration-node: node_modules
	node test/integration/runner.js test/integration/test-*.js $(TAP)

test-integration-browser: node_modules
	node test/integration/runner.js test/integration/test-*.js $(BROWSER_OPTS)

clean:
	@$(RM) -fr docs/*
	@$(RM) -fr tmp
	@$(RM) -fr node_modules
	@$(RM) -fr npm-debug.log
	@$(RM) -fr xunit.xml

docs: $(JS_SRC_FILES) | node_modules
	jsdoc $^ --template node_modules/ink-docstrap/template --destination $@

node_modules: package.json
	@npm prune
	@npm install
	@touch node_modules

.PHONY: all build clean dependency-check lint test
.PHONY: test-integration test-integration-node test-integration-browser
.PHONY: test-unit test-unit-node test-unit-browser
