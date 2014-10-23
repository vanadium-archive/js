PATH := node_modules/.bin:${VEYRON_ROOT}/environment/cout/node/bin:$(PATH)

GOPATH := $(VEYRON_ROOT)/veyron.js/go
VDLPATH := $(GOPATH)
GOBIN := $(VEYRON_ROOT)/veyron.js/go/bin
VGO := GOPATH="$(GOPATH)" VDLPATH="$(VDLPATH)" veyron go
VIO_FILES := $(shell find $(VEYRON_ROOT)/veyron/go/src/veyron.io -name "*.go")

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

$(NACLGOROOT)/bin/go:
	$(NACLGOROOT)/src/make-nacl.sh

updated-go-compiler: validate-naclgoroot $(NACLGOROOT)/bin/go
	GOARCH=386 GOOS=nacl "$(NACLGOROOT)/bin/go" install ...

naclgoroot-is-set:
ifndef NACLGOROOT
	$(error NACLGOROOT is not set)
endif

validate-naclgoroot: naclgoroot-is-set
ifeq (,$(wildcard $(NACLGOROOT)/src/make-nacl.sh))
	$(error NACLGOROOT not set to a go compiler with NACL support. $(NACLGOROOT)/src/make-nacl.sh missing.)
endif

#TODO(bprosnitz) Remove the novdl flag once it works on non-host architectures
nacl/out/wspr.nexe: validate-naclgoroot updated-go-compiler
	veyron -target-go=$(NACLGOROOT)/bin/go xgo -novdl 386-nacl build -o $@ "veyron.io/wspr/veyron/services/wsprd/wspr_nacl"

nacl/out/index.html: nacl/html/index.html
	@cp -f $< $@

nacl/out/manifest.json: nacl/html/manifest.json
	@cp -f $< $@

nacl/out/wspr.nmf: nacl/html/wspr.nmf
	@cp -f $< $@

nacl/out/wspr.js: nacl/html/wspr.js
	@cp -f $< $@

chromebin-is-set:
ifndef CHROME_BIN
	$(error CHROME_BIN is not set)
endif

validate-chromebin: chromebin-is-set
	[[ `objdump -f $(CHROME_BIN) | grep architecture | cut -f2 -d\ | cut -f1 -d,` = "i386" ]] || { echo "CHROME_BIN does not contain a 32-bit chrome executable."; exit 1; }

nacl/out: nacl/out/wspr.nexe nacl/out/index.html nacl/out/manifest.json nacl/out/wspr.nmf nacl/out/wspr.js

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

#TODO(bprosnitz) Add test-integration-nacl
test-integration: lint test-integration-node test-integration-browser

test-integration-node: node_modules go/bin
	node test/integration/runner.js test/integration/test-*.js $(TAP)

test-integration-browser: node_modules go/bin
	node test/integration/runner.js test/integration/test-*.js $(BROWSER_OPTS)

test-integration-nacl: validate-chromebin node_modules nacl/out go/bin
	node test/integration/runner.js --use-nacl test/integration/test-*.js $(BROWSER_OPTS)

go/bin: go/src $(VIO_FILES)
	@$(VGO) build -o $(GOBIN)/mounttabled veyron.io/veyron/veyron/services/mounttable/mounttabled
	@$(VGO) build -o $(GOBIN)/identityd veyron.io/veyron/veyron/services/identity/identityd
	@$(VGO) build -o $(GOBIN)/proxyd veyron.io/veyron/veyron/services/proxy/proxyd
	@$(VGO) build -o $(GOBIN)/identity veyron.io/veyron/veyron/tools/identity
	@$(VGO) build -o $(GOBIN)/wsprd veyron.io/wspr/veyron/services/wsprd
	@$(VGO) build -o $(GOBIN)/wspr_sampled wspr_sample/wspr_sampled

clean:
	@$(RM) -fr docs/*
	@$(RM) -fr nacl/out/*
	@$(RM) -fr tmp
	@$(RM) -fr node_modules
	@$(RM) -fr npm-debug.log
	@$(RM) -fr xunit.xml
	@$(RM) -fr go/bin
	@$(RM) -fr go/pkg

docs: $(JS_SRC_FILES) | node_modules
	jsdoc $^ --template node_modules/ink-docstrap/template --destination $@

node_modules: package.json  check-that-npm-is-in-path | node_modules/vom/lib/index.js
	@npm prune
	@npm install
	@touch node_modules

node_modules/vom/lib/index.js:
	cd "$(VEYRON_ROOT)/veyron/javascript/vom" && npm link
	:;npm link vom

check-that-npm-is-in-path:
	@which npm > /dev/null || { echo "npm is not in the path. Did you remember to run 'veyron profile setup web'?"; exit 1; }

.PHONY: all build clean dependency-check lint test
.PHONY: test-integration test-integration-node test-integration-browser test-integration-nacl
.PHONY: test-unit test-unit-node test-unit-browser
.PHONY: updated-go-compiler naclgoroot-is-set validate-naclgoroot
.PHONY: chromebin-is-set validate-chromebin
.PHONY: check-that-npm-is-in-path

# Prevent the tests from running in parallel, which causes problems because it
# starts multiple instances of the services at once.
.NOTPARALLEL: test-integration test-unit test
