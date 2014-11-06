PATH := node_modules/.bin:${VEYRON_ROOT}/environment/cout/node/bin:$(PATH)
SHELL := /bin/bash -e -o pipefail
.DEFAULT_GOAL := all

JS_FILES = $(shell find lib -name "*.js" -o -name "*.css")

# browserify $1 --transform brfs --debug --plugin [ minifyify --map /options.js.map --output $2.map ] --outfile $2
define BROWSERIFY
	mkdir -p $(dir $2)
	browserify $1 --transform brfs --debug --outfile $2
endef

all: veyron.crx

build/html:
	cp -r html build

build/images:
	cp -r images build

build/manifest.json:
	cp manifest.json build

build/js/background.js: lib/background/index.js $(JS_FILES) node_modules
	$(call BROWSERIFY,$<,$@)

build/js/content.js: lib/content/index.js $(JS_FILES) node_modules
	$(call BROWSERIFY,$<,$@)

build/js/options.js: lib/background/options.js $(JS_FILES) node_modules
	$(call BROWSERIFY,$<,$@)

build/js: build/js/background.js build/js/content.js build/js/options.js

build: build/html build/images build/manifest.json build/js

veyron.crx: build
	./bin/crxmake.sh ./build ./dev-cert.pem veyron

example-server: example/index.bundle.js
	static "example" -H '{"Cache-Control": "no-cache, must-revalidate"}'

example/index.bundle.js: example/index.js node_modules
	browserify $< --transform brfs --debug --plugin [ minifyify --map /index.bundle.js.map --output $@.map ] --outfile $@

lint: node_modules
	jshint lib/ example/index.js

dependency-check: node_modules
	dependency-check package.json --entry lib/background/index.js --entry lib/content/index.js

wspr:
	wsprd -veyron.proxy="/proxy.envyor.com:8100" -identd="/proxy.envyor.com:8101/identity/veyron-test/google"

clean:
	@$(RM) -fr node_modules npm-debug.log
	@$(RM) -fr veyron.crx build


node_modules: package.json
	@npm prune
	@npm install

.PHONY: all build clean dependency-check lint wspr
