PATH := node_modules/.bin:${VEYRON_ROOT}/environment/cout/node/bin:$(PATH)
SHELL := /bin/bash -e -o pipefail
.DEFAULT_GOAL := all

JS_FILES = $(shell find lib -name "*.js" -o -name "*.css")

define BROWSERIFY
	mkdir -p $(dir $2)
	browserify $1 --transform brfs --debug --plugin [ minifyify --map /options.js.map --output $2.map ] --outfile $2
endef

define BROWSERIFY-TEST
	mkdir -p $(dir $2)
	browserify $1 --transform brfs --transform envify --debug --outfile $2
endef

all: veyron.crx

naclgoroot-is-set:
ifndef NACLGOROOT
	$(error NACLGOROOT is not set)
endif

# TODO(nlacasse): Put the veyron-go-compiler in the web profile so other devs
# will have it, and then make this task a prereq of build/ and build-test/
# tasks.  For now, devs who want to the nacl binary will have to run "make
# nacl" manually.
# TODO(nlacasse): Update and recompile the compiler itself before building the
# nacl plugin.
nacl/main-64.nexe: GOROOT :=
nacl/main-64.nexe: GOARCH := amd64p32
nacl/main-64.nexe: GOOS := nacl
# TODO(bprosnitz) Remove the novdl flag once it works on non-host architectures
nacl/main-64.nexe: $(VEYRON_ROOT)/veyron/go/src/veyron.io/wspr/veyron/services/wsprd/browspr/main/main_nacl.go
	veyron xgo --target_go=$(NACLGOROOT)/bin/go -novdl amd64p32-nacl build -o $@ $<

nacl: nacl/main-64.nexe | naclgoroot-is-set

build/html: html/*
	mkdir -p build
	cp -r html build

build/images: images/*
	mkdir -p build
	cp -r images build

build/manifest.json: manifest.json
	mkdir -p build
	cp manifest.json build

build/js/background.js: lib/background/index.js $(JS_FILES) node_modules
	$(call BROWSERIFY,$<,$@)

build/js/content.js: lib/content/index.js $(JS_FILES) node_modules
	$(call BROWSERIFY,$<,$@)

build/js/options.js: lib/background/options.js $(JS_FILES) node_modules
	$(call BROWSERIFY,$<,$@)

build/js/addcaveats.js: lib/background/addcaveats.js $(JS_FILES) node_modules
	$(call BROWSERIFY,$<,$@)

build/js: build/js/background.js build/js/content.js build/js/options.js build/js/addcaveats.js

build/nacl:
	cp -r nacl build

build: build/html build/images build/manifest.json build/js build/nacl

veyron.crx: build
	./bin/crxmake.sh ./build ./dev-cert.pem veyron

build-test/html: html/*
	mkdir -p build-test
	cp -r html build-test

build-test/images: images/*
	mkdir -p build-test
	cp -r images build-test

build-test/manifest.json: manifest.json
	mkdir -p build-test
	cp manifest.json build-test

build-test/js/background.js: lib/background/index.js $(JS_FILES) node_modules
	$(call BROWSERIFY-TEST,$<,$@)

build-test/js/content.js: lib/content/index.js $(JS_FILES) node_modules
	$(call BROWSERIFY-TEST,$<,$@)

build-test/js/options.js: lib/background/options.js $(JS_FILES) node_modules
	$(call BROWSERIFY-TEST,$<,$@)

build-test/js/addcaveats.js: lib/background/addcaveats.js $(JS_FILES) node_modules
	$(call BROWSERIFY-TEST,$<,$@)

build-test/js: build-test/js/background.js build-test/js/content.js build-test/js/options.js build-test/js/addcaveats.js

build-test/nacl:
	cp -r nacl build-test

build-test: build-test/html build-test/images build-test/manifest.json build-test/js build-test/nacl

example-server: example/index.bundle.js
	static "example" -H '{"Cache-Control": "no-cache, must-revalidate"}'

example/index.bundle.js: example/index.js node_modules
	browserify $< --transform brfs --debug --outfile $@

lint: node_modules
	jshint lib/ example/index.js

dependency-check: node_modules
	dependency-check package.json --entry lib/background/index.js --entry lib/content/index.js

clean:
	@$(RM) -fr node_modules npm-debug.log
	@$(RM) -fr veyron.crx build build-test

node_modules: package.json
	@npm prune
	@npm install

.PHONY: all build clean dependency-check lint wspr
.PHONY: naclgoroot-is-set
.PHONY: nacl nacl/main-64.nexe

# Always rebuild the example server.
.PHONY: example/index.bundle.js
