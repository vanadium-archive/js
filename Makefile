PATH := node_modules/.bin:${VEYRON_ROOT}/environment/cout/node/bin:$(PATH)
SHELL := /bin/bash -e -o pipefail
.DEFAULT_GOAL := all

JS_SRC_FILES = $(shell find src -name "*.js")
JS_SPEC_TESTS = test/test_helper.js $(shell find test/specs -name "*.js")
JS_INTEGRATION_TESTS = test/test_helper.js $(shell find test/integration -name "*.js")

all: build

build: dist/veyron.js dist/veyron.min.js

dist/veyron.js: src/veyron.js $(JS_SRC_FILES) | node_modules
	browserify $< --debug --outfile $@

dist/veyron.min.js: src/veyron.js $(JS_SRC_FILES) | node_modules
	browserify $< --debug --plugin [ minifyify --map dist/veyron.js.map --output $@.map ] --outfile $@

test_out:
	mkdir -p test_out

test_out/veyron.test.specs.js: $(JS_SPEC_TESTS) | test_out node_modules
	browserify $^ --debug --outfile $@

test_out/veyron.test.integration.js: $(JS_INTEGRATION_TESTS) src/veyron.js | test_out node_modules
	browserify $^ --debug --outfile $@

test: lint dependency-check test_out/veyron.test.specs.js test_out/veyron.test.integration.js
	./vgrunt

lint: node_modules
	jshint src/ test/

dependency-check: node_modules
	dependency-check package.json --entry src/veyron.js

clean:
	@$(RM) -fr docs/* logs/* test_out/* node_modules npm-debug.log

docs: $(JS_SRC_FILES) | node_modules
	jsdoc $^ --template node_modules/ink-docstrap/template --destination $@

node_modules: package.json
	@npm prune
	@npm install

.PHONY: all build clean dependency-check lint test
