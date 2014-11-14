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

build/nacl/main.nmf: nacl/main.nmf
	mkdir -p build/nacl
	cp nacl/main.nmf build/nacl

build/nacl/main.nexe: GOROOT :=
build/nacl/main.nexe: GOARCH := 386
build/nacl/main.nexe: GOOS := nacl
build/nacl/main.nexe: nacl/src/main.go
	"${NACLGOROOT}/bin/go" install ...
	veyron xgo --target_go=$(NACLGOROOT)/bin/go -novdl 386-nacl build -o $@ $<

build/nacl: build/nacl/main.nmf build/nacl/main.nexe

build: build/html build/images build/manifest.json build/js

# Build the nacl binary and include it in the extension. This task depends on a
# working go-nacl compiler in NACLGOROOT.
# TODO(nlacasse): Once more devs have the NACLGOROOT environment, this task
# should be renamed to just "build'.
build-with-nacl: build build/nacl

veyron.crx: build
	./bin/crxmake.sh ./build ./dev-cert.pem veyron

example-server: example/index.bundle.js
	static "example" -H '{"Cache-Control": "no-cache, must-revalidate"}'

example/index.bundle.js: example/index.js node_modules
	browserify $< --transform brfs --debug --outfile $@

run-chrome: CHROME_USER_DIR := $(shell mktemp -u -d)
run-chrome: export CHROME_DEVEL_SANDBOX := $(dir $(CHROME_BIN))/chrome_sandbox
run-chrome:
	$(CHROME_BIN) \
	--disable-restore-session-state --no-default-browser-check --start-maximized --disable-default-apps \
	--disable-sync --enable-fixed-layout --no-first-run --noerrdialogs \
	--vmodule=ppb*=4 --enable-logging=stderr --user-data-dir="${CHROME_USER_DIR}" \
	--allow-nacl-socket-api=* \
	--load-extension="$(PWD)/build" http://localhost:8080/index.html; \
	rm -r "${CHROME_USER_DIR}"

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
