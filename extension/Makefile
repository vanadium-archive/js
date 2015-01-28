PATH := node_modules/.bin:${VANADIUM_ROOT}/environment/cout/node/bin:$(PATH)
SHELL := /bin/bash -e -o pipefail
.DEFAULT_GOAL := all

JS_FILES = $(shell find lib -name "*.js" -o -name "*.css")

define BROWSERIFY
	mkdir -p $(dir $2)
	browserify $1 --transform brfs --debug --outfile $2
endef

define BROWSERIFY-TEST
	mkdir -p $(dir $2)
	browserify $1 --transform brfs --transform envify --debug --outfile $2
endef

define COMPILE-NACL-PLUGIN
	mkdir -p $(dir $2)
	GOARCH=amd64p32 \
	GOOS=nacl \
	GOROOT= \
	v23 xgo --target_go=$(VANADIUM_ROOT)/environment/go_ppapi/bin/go amd64p32-nacl build -o $2 $1
endef

all: veyron.zip

build/html: html/*
	mkdir -p build
	cp -r html build

build/images: images/*
	mkdir -p build
	cp -r images build

build/manifest.json: manifest.json
	mkdir -p build
	cp manifest.json build

build/js/background.js: lib/background/index.js $(JS_FILES) gen-vdl node_modules
	$(call BROWSERIFY,$<,$@)

build/js/content.js: lib/content/index.js $(JS_FILES) node_modules
	$(call BROWSERIFY,$<,$@)

build/js/options.js: lib/background/options.js $(JS_FILES) node_modules
	$(call BROWSERIFY,$<,$@)

build/js/addcaveats.js: lib/background/addcaveats.js $(JS_FILES) node_modules
	$(call BROWSERIFY,$<,$@)

build/js: build/js/background.js build/js/content.js build/js/options.js build/js/addcaveats.js

build/nacl/main.nmf: nacl
	mkdir -p $(dir $@)
	cp -r nacl/main.nmf $@

build/nacl/main-64.nexe: $(VANADIUM_ROOT)/release/go/src/v.io/wspr/veyron/services/wsprd/browspr/main/main_nacl.go
	$(call COMPILE-NACL-PLUGIN,$<,$@)

build/nacl: build/nacl/main.nmf build/nacl/main-64.nexe

build: build/html build/images build/manifest.json build/js build/nacl

veyron.zip: build
	zip -r $@ ./build/*

build-test/html: html/*
	mkdir -p build-test
	cp -r html build-test

build-test/images: images/*
	mkdir -p build-test
	cp -r images build-test

build-test/manifest.json: manifest.json
	mkdir -p build-test
	cp manifest.json build-test
	patch build-test/manifest.json < manifest-test.json.patch # Adds "key" as first line.

build-test/js/background.js: lib/background/index.js $(JS_FILES) gen-vdl node_modules
	$(call BROWSERIFY-TEST,$<,$@)

build-test/js/content.js: lib/content/index.js $(JS_FILES) node_modules
	$(call BROWSERIFY-TEST,$<,$@)

build-test/js/options.js: lib/background/options.js $(JS_FILES) node_modules
	$(call BROWSERIFY-TEST,$<,$@)

build-test/js/addcaveats.js: lib/background/addcaveats.js $(JS_FILES) node_modules
	$(call BROWSERIFY-TEST,$<,$@)

# The EXTENSION_SETTINGS env variable is used by the extension to set the default settings variables.
build-test/js: export EXTENSION_SETTINGS := {"namespaceRoot": "$(NAMESPACE_ROOT)",\
                                             "proxy": "test/proxy",\
                                             "identityd": "$(IDENTITYD)",\
                                             "identitydBlessingUrl": "$(IDENTITYD_BLESSING_URL)",\
                                             "logLevel": "1",\
                                             "logModule": "wspr.go=3"}
# The TEST_ACCESS_TOKEN and TEST_CAVEATS env variables allow the tests to run without user input.
build-test/js: export TEST_ACCESS_TOKEN := test-access-token
build-test/js: export TEST_CAVEATS := 24h
# The ALLOW_INTENTIONAL_CRASH env variable is used to test that the extension can restart after a crash.
build-test/js: export ALLOW_INTENTIONAL_CRASH := true
build-test/js: build-test/js/background.js build-test/js/content.js build-test/js/options.js build-test/js/addcaveats.js

build-test/nacl/main.nmf: nacl
	mkdir -p $(dir $@)
	cp -r nacl/main.nmf $@

build-test/nacl/main-64.nexe: $(VANADIUM_ROOT)/release/go/src/v.io/wspr/veyron/services/wsprd/browspr/main/main_nacl.go
	$(call COMPILE-NACL-PLUGIN,$<,$@)

build-test/nacl: build-test/nacl/main.nmf build-test/nacl/main-64.nexe

build-test: build-test/html build-test/images build-test/manifest.json build-test/js build-test/nacl

gen-vdl: $(VANADIUM_ROOT)/release/go/src/v.io/wspr/veyron/services/wsprd/channel/channel.vdl
	v23 go run $(VANADIUM_ROOT)/release/go/src/v.io/core/veyron2/vdl/vdl/main.go \
	generate -lang=javascript -js_out_dir="$(VANADIUM_ROOT)/release/javascript/core/extension/vdl" $(dir $^)

example-server: example/index.bundle.js
	static "example" -H '{"Cache-Control": "no-cache, must-revalidate"}'

example/index.bundle.js: example/index.js node_modules
	browserify $< --transform brfs --global-transform envify --debug --outfile $@

lint: node_modules
	jshint lib/ example/index.js

dependency-check: node_modules
	dependency-check package.json --entry lib/background/index.js --entry lib/content/index.js

clean:
	@$(RM) -fr node_modules npm-debug.log
	@$(RM) -fr veyron.zip build build-test

node_modules: package.json | check-that-npm-is-in-path node_modules/vom/lib/index.js
	@npm prune
	@npm install --quiet

node_modules/vom/lib/index.js:
	cd "$(VANADIUM_ROOT)/release/javascript/vom" && npm link
	:;npm link vom

check-that-npm-is-in-path:
	@which npm > /dev/null || { echo "npm is not in the path. Did you remember to run 'v23 profile setup web'?"; exit 1; }

.PHONY: all build clean dependency-check gen-vdl lint

# Always rebuild the plugin.
.PHONY: nacl/main-64.nexe

# Always rebuild the example server.
.PHONY: example/index.bundle.js
