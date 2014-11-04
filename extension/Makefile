PATH := node_modules/.bin:${VEYRON_ROOT}/environment/cout/node/bin:$(PATH)
SHELL := /bin/bash -e -o pipefail
.DEFAULT_GOAL := all

JS_FILES = $(shell find lib -name "*.js" -o -name "*.css")

all: extension/background.js extension/content.js extension/options.js

extension/options.js: lib/background/options.js $(JS_FILES) node_modules
	browserify $< --transform brfs --debug --plugin [ minifyify --map /options.js.map --output $@.map ] --outfile $@

extension/background.js: lib/background/index.js $(JS_FILES) node_modules
	browserify $< --transform brfs --debug --plugin [ minifyify --map /background.js.map --output $@.map ] --outfile $@

extension/content.js: lib/content/index.js $(JS_FILES) node_modules
	browserify $< --transform brfs --debug --plugin [ minifyify --map /content.js.map --output $@.map ] --outfile $@

veyron.crx: all
	./bin/crxmake.sh ./extension ./dev-cert.pem veyron

example-server: example/index.bundle.js
	static "example" -H '{"Cache-Control": "no-cache, must-revalidate"}'

example/index.bundle.js: example/index.js node_modules
	browserify $< --transform brfs --debug --plugin [ minifyify --map /index.bundle.js.map --output $@.map ] --outfile $@

lint: node_modules
	jshint lib/ example/index.js

dependency-check: node_modules
	dependency-check package.json --entry lib/background/index.js --entry lib/content/index.js

wspr:
	wsprd -vproxy="/proxy.envyor.com:8100" -identd="/proxy.envyor.com:8101/identity/veyron-test/google"

clean:
	@$(RM) -fr node_modules npm-debug.log
	@$(RM) -fr veyron.crx extension/options.js extension/background.js extension/options.js


node_modules: package.json
	@npm prune
	@npm install

.PHONY: all build clean dependency-check lint wspr
