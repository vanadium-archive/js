PATH := node_modules/.bin:${VANADIUM_ROOT}/environment/cout/node/bin:$(PATH)

GOPATH := $(VANADIUM_ROOT)/release/javascript/core/go
VDLPATH := $(GOPATH)
GOBIN := $(VANADIUM_ROOT)/release/javascript/core/go/bin
VGO := GOPATH="$(GOPATH)" VDLPATH="$(VDLPATH)" v23 go
GO_FILES := $(shell find go/src $(VANADIUM_ROOT)/release/go/src/v.io -name "*.go")

NODE_MODULE_JS_FILES := $(shell find node_modules -name *.js | sed 's/ /\\ /')

SHELL := /bin/bash -e -o pipefail

UNAME := $(shell uname)

.DEFAULT_GOAL := all

# Default browserify options: create a standalone bundle, and use sourcemaps.
BROWSERIFY_OPTS := --standalone vanadium --debug
# Names that should not be mangled by minification.
RESERVED_NAMES := 'context,ctx,callback,cb,$$stream'
# Don't mangle RESERVED_NAMES, and screw ie8.
MANGLE_OPTS := --mangle [--except $(RESERVED_NAMES) --screw_ie8 ]
# Don't remove unused variables from function arguments, which could mess up signatures.
# Also don't evaulate constant expressions, since we rely on them to conditionally require modules only in node.
COMPRESS_OPTS := --compress [ --no-unused --no-evaluate ]

# Browserify and extract sourcemap, but do not minify.
define BROWSERIFY
	mkdir -p $(dir $2)
	browserify $1 $(BROWSERIFY_OPTS) | exorcist $2.map > $2
endef

# Browserify, minify, and extract sourcemap.
define BROWSERIFY-MIN
	mkdir -p $(dir $2)
	browserify $1 $(BROWSERIFY_OPTS) --g [ uglifyify $(MANGLE_OPTS) $(COMPRESS_OPTS) ] | exorcist $2.map > $2
endef

# When running browser tests on non-Darwin machines, set the --headless flag.
# This uses Xvfb underneath the hood (inside prova => browser-launcher =>
# headless), which is not supported on OS X.
# See: https://github.com/kesla/node-headless/
ifndef NOHEADLESS
	ifneq ($(UNAME),Darwin)
		HEADLESS := --headless
	endif
endif

ifdef STOPONFAIL
	STOPONFAIL := --stopOnFirstFailure
endif

ifndef NOTAP
	TAP := --tap
endif

ifndef NOQUIT
	QUIT := --quit
endif

ifdef XUNIT
	TAP := --tap # TAP must be set for xunit to work
	OUTPUT_TRANSFORM := tap-xunit
endif

ifdef NODE_OUTPUT
	NODE_OUTPUT_LOCAL = $(NODE_OUTPUT)
	ifdef OUTPUT_TRANSFORM
		NODE_OUTPUT_LOCAL := >($(OUTPUT_TRANSFORM) --package=javascript.node > $(NODE_OUTPUT_LOCAL))
	endif
	NODE_OUTPUT_LOCAL := | tee $(NODE_OUTPUT_LOCAL)
endif

ifdef BROWSER_OUTPUT
	BROWSER_OUTPUT_LOCAL = $(BROWSER_OUTPUT)
	ifdef OUTPUT_TRANSFORM
		BROWSER_OUTPUT_LOCAL := >($(OUTPUT_TRANSFORM) --package=javascript.browser > $(BROWSER_OUTPUT_LOCAL))
	endif
	BROWSER_OUTPUT_LOCAL := | tee $(BROWSER_OUTPUT_LOCAL)
endif

PROVA_OPTS := --includeFilenameAsPackage $(TAP) $(QUIT) $(STOPONFAIL)

BROWSER_OPTS := --browser --transform envify --launch chrome $(HEADLESS)

JS_SRC_FILES = $(shell find src -name "*.js" | sed 's/ /\\ /')

# Common services needed for all integration tests. Must be a comma-seperated
# string with no spaces.
COMMON_SERVICES := "test_serviced"

all: gen-vdl lint build

build: dist/vanadium.js dist/vanadium.min.js extension/vanadium.zip

dist/vanadium.js: src/vanadium.js $(JS_SRC_FILES) $(NODE_MODULES_JS_FILES) | node_modules
	$(call BROWSERIFY,$<,$@)

dist/vanadium.min.js: src/vanadium.js $(JS_SRC_FILES) $(NODE_MODULES_JS_FILES) | node_modules
	$(call BROWSERIFY-MIN,$<,$@)

extension/vanadium.zip: node_modules
	$(MAKE) -C extension vanadium.zip

test-precheck: gen-vdl-test node_modules lint dependency-check

test: test-unit test-integration test-vdl test-vom

test-vdl: test-vdl-node test-vdl-browser

test-vom: test-vom-node test-vom-browser

# This generates the output of the vdl files in src/v.io/<package-path>
# The command will generate all the dependent files as well.
gen-vdl: JS_VDL_DIR := "$(VANADIUM_ROOT)/release/javascript/core/src"
gen-vdl: JS_VDL_PATH_TO_CORE := "."
gen-vdl: gen-vdl-impl

# This generates the output of the vdl files in test/vdl-out/v.io/<package-path>
# The command will generate all the dependent files as well.
gen-vdl-test: JS_VDL_DIR := "$(VANADIUM_ROOT)/release/javascript/core/test/vdl-out"
gen-vdl-test: EXTRA_VDL_PATHS := "javascript-test/..." "test_service/..."
gen-vdl-test: VDLPATH := "$(VANADIUM_ROOT)/release/javascript/core/test/vdl-in:$(VANADIUM_ROOT)/release/javascript/core/go"
gen-vdl-test: JS_VDL_PATH_TO_CORE := "../../src"
gen-vdl-test: clean-test-vdl gen-vdl-impl

clean-test-vdl:
	rm -rf $(JS_VDL_DIR)

gen-vdl-impl:
ifndef NOVDLGEN
	VDLPATH=$(VDLPATH) v23 go run $(VANADIUM_ROOT)/release/go/src/v.io/core/veyron/tools/vdl/main.go generate -lang=javascript \
		-js_relative_path_to_core=$(JS_VDL_PATH_TO_CORE) \
		-js_out_dir=$(JS_VDL_DIR) \
		v.io/core/veyron/lib/vdl/testdata/... \
		v.io/core/veyron/services/wsprd/... \
		v.io/v23/ipc/... \
		v.io/v23/naming/... \
		v.io/v23/verror/... \
		v.io/v23/vom/... \
		$(EXTRA_VDL_PATHS)
	# We build the vdlroot stuff with a different set of command line options because the package path does
	# not equal the directory path of the source file.  This is not ideal, but bjornick and toddw will discuss
	# how to fix this later.
	VDLPATH=$(VDLPATH) v23 go run $(VANADIUM_ROOT)/release/go/src/v.io/core/veyron/tools/vdl/main.go generate -lang=javascript \
					-js_relative_path_to_core=../../../$(JS_VDL_PATH_TO_CORE) \
					-js_out_dir=$(JS_VDL_DIR) \
					$(VANADIUM_ROOT)/release/go/src/v.io/v23/vdlroot/...
endif

test-vdl-node: test-precheck
	prova test/vdl/test-*.js $(PROVA_OPTS) $(NODE_OUTPUT_LOCAL)

test-vdl-browser: test-precheck
	prova test/vdl/test-*.js $(PROVA_OPTS) $(BROWSER_OPTS) $(BROWSER_OUTPUT_LOCAL)

test-vom-node: test-precheck
	prova test/vom/test-*.js $(PROVA_OPTS) $(NODE_OUTPUT_LOCAL)

test-vom-browser: test-precheck
	prova test/vom/test-*.js $(PROVA_OPTS) $(BROWSER_OPTS) $(BROWSER_OUTPUT_LOCAL)

test-unit: test-unit-node test-unit-browser

test-unit-node: test-precheck
	prova test/unit/test-*.js $(PROVA_OPTS) $(NODE_OUTPUT_LOCAL)

test-unit-browser: test-precheck
	prova test/unit/test-*.js $(PROVA_OPTS) $(BROWSER_OPTS) $(BROWSER_OUTPUT_LOCAL)

test-integration: lint test-integration-node test-integration-browser

test-integration-node: test-precheck go/bin
	node test/integration/runner.js --services=$(COMMON_SERVICES) -- \
	prova test/integration/test-*.js $(PROVA_OPTS) $(NODE_OUTPUT_LOCAL)

test-integration-browser: test-precheck go/bin
	node test/integration/runner.js --services=$(COMMON_SERVICES) -- \
	make test-integration-browser-runner

test-integration-browser-runner: BROWSER_OPTS := --options="--load-extension=$(PWD)/extension/build-test/,--ignore-certificate-errors,--enable-logging=stderr" $(BROWSER_OPTS)
test-integration-browser-runner:
	@$(RM) -fr extension/build-test
	$(MAKE) -C extension build-test
	prova test/integration/test-*.js --log=./tmp/chrome.log $(PROVA_OPTS) $(BROWSER_OPTS) $(BROWSER_OUTPUT_LOCAL) $(SAVE_CHROME_LOGS)

go/bin: $(GO_FILES)
	@$(VGO) build -o $(GOBIN)/principal v.io/core/veyron/tools/principal
	@$(VGO) build -o $(GOBIN)/servicerunner v.io/core/veyron/tools/servicerunner
	@$(VGO) build -o $(GOBIN)/test_serviced test_service/test_serviced

lint: node_modules
ifdef NOLINT
	@echo "Skipping lint - disabled by NOLINT environment variable"
else
	jshint .
	$(MAKE) -C extension lint
endif

dependency-check: node_modules
	dependency-check package.json --entry src/vanadium.js

clean:
	@$(RM) -fr dist/*
	@$(RM) -fr docs/*
	@$(RM) -fr go/bin
	@$(RM) -fr go/pkg
	@$(RM) -fr node_modules
	@$(RM) -fr npm-debug.log
	@$(RM) -fr tmp
	@$(RM) -fr xunit.xml
	$(MAKE) -C extension clean

docs: $(JS_SRC_FILES) | node_modules
	jsdoc $^ --template node_modules/ink-docstrap/template --destination $@

# staging-docs
#
# Builds the jsdoc and then deploys it to https://staging.jsdoc.v.io
#
# If you do not have access to the vanadium-staging GCE account ping
# jasoncampbell@. Once you have access you will need to login to the account
# via the command line with:
#
#     gcloud auth login
#
# To deploy the docs use this make target:
#
#     make staging-docs
#
# This will sync the docs directory to the private Google Storage bucket
# gs://staging.jsdoc.v.io which gets automatically updated to the nginx
# front-end servers. Currently all static content is protected by OAuth.
.PHONY: staging-docs
staging-docs: docs
	gcloud config set project vanadium-staging
	gsutil -m rsync -d -r ./docs gs://staging.jsdoc.v.io

node_modules: package.json  check-that-npm-is-in-path
ifndef NONPMUPDATE
	@npm prune
	@npm install --quiet
	@touch node_modules
endif

check-that-npm-is-in-path:
	@which npm > /dev/null || { echo "npm is not in the path. Did you remember to run 'v23 profile setup web'?"; exit 1; }

.PHONY: all build clean dependency-check lint test
.PHONY: test-integration test-integration-node test-integration-browser
.PHONY: test-unit test-unit-node test-unit-browser
.PHONY: check-that-npm-is-in-path
.PHONY: gen-vdl gen-vdl-test gen-vdl-impl

# Prevent the tests from running in parallel, which causes problems because it
# starts multiple instances of the services at once, and also because it
# interleaves the test output.
.NOTPARALLEL: test-integration test-integration-browser test-integration-node
.NOTPARALLEL: test-unit test-unit-node test-unit-browser
.NOTPARALLEL: test-vdl test-vdl-node test-vdl-browser
