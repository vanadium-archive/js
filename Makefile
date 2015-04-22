PATH := node_modules/.bin:${V23_ROOT}/third_party/cout/node/bin:$(PATH)

NODE_BIN := $(V23_ROOT)/release/javascript/core/node_modules/.bin
GOPATH := $(V23_ROOT)/release/javascript/core/go
VDLPATH := $(GOPATH)
GOBIN := $(V23_ROOT)/release/javascript/core/go/bin
VGO := GOPATH="$(GOPATH)" VDLPATH="$(VDLPATH)" v23 go
GO_FILES := $(shell find go/src $(V23_ROOT)/release/go/src/v.io -name "*.go")

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

all: gen-vdl lint build docs

build: dist docs extension/vanadium.zip

dist/vanadium.js: src/vanadium.js $(JS_SRC_FILES) $(NODE_MODULES_JS_FILES) | node_modules
	$(call BROWSERIFY,$<,$@)

dist/vanadium.min.js: src/vanadium.js $(JS_SRC_FILES) $(NODE_MODULES_JS_FILES) | node_modules
	$(call BROWSERIFY-MIN,$<,$@)

dist: dist/vanadium.js dist/vanadium.min.js

extension/vanadium.zip: node_modules
	$(MAKE) -C extension vanadium.zip

test-precheck: gen-vdl-test node_modules lint dependency-check

test: test-unit test-integration test-vdl test-vom

test-vdl: test-vdl-node test-vdl-browser

# This generates the VDL files and asks git if there are any changed files.
# We don't have to check the extension since it does not check in VDL files.
#
# The alternative is to use the vdl audit command, but that requires checking
# after both vdl commands in gen-vdl-impl as opposed to a single git status.
test-vdl-audit: gen-vdl
	@if [ "`git status --porcelain | grep ' src/gen-vdl/' | sed 's/^ //'`" != "" ]; then \
	  echo "Some VDL files changed but were not committed!"; \
	  echo "`git status --porcelain | grep ' src/gen-vdl/' | sed 's/^ //'`"; \
	  echo "Run 'make gen-vdl' in the javascript/core repo, and commit the changed files."; \
	  exit 1; \
	fi

test-vom: test-vom-node test-vom-browser

# This generates the output of the vdl files in src/gen-vdl/v.io/<package-path>
# The command will generate all the dependent files as well.
gen-vdl: JS_VDL_DIR := "$(V23_ROOT)/release/javascript/core/src/gen-vdl"
gen-vdl: JS_VDL_PATH_TO_CORE := ".."
gen-vdl: gen-vdl-impl

# This generates the output of the vdl files in test/vdl-out/gen-vdl/v.io/<package-path>
# The command will generate all the dependent files as well.
gen-vdl-test: JS_VDL_DIR := "$(V23_ROOT)/release/javascript/core/test/vdl-out"
gen-vdl-test: EXTRA_VDL_PATHS := "javascript-test/..." "v.io/x/js.core/test_service/..."
gen-vdl-test: VDLPATH := "$(V23_ROOT)/release/javascript/core/test/vdl-in:$(V23_ROOT)/release/javascript/core/go"
gen-vdl-test: JS_VDL_PATH_TO_CORE := "../../src"
gen-vdl-test: gen-vdl-impl

# This generates the vdl files used by test/vom/test-vdl-arith.js
# They are placed in test/vdl/expected-gen/v.io/<package-path>.
# This command is not normally run by the tests. It should only be run when the
# expected vdl files need to be updated.
gen-vdl-test-expected: JS_VDL_DIR := "$(V23_ROOT)/release/javascript/core/test/vdl/expected-gen"
gen-vdl-test-expected: JS_VDL_PATH_TO_CORE := "../../../src"
gen-vdl-test-expected: gen-vdl-test-expected-impl

gen-vdl-test-expected-impl:
	rm -rf $(JS_VDL_DIR)
	echo $(VDLPATH)
	VDLPATH=$(VDLPATH) v23 go run $(V23_ROOT)/release/go/src/v.io/x/ref/cmd/vdl/main.go generate -lang=javascript \
		-js-relative-path-to-core=$(JS_VDL_PATH_TO_CORE) \
		-js-out-dir=$(JS_VDL_DIR) \
		v.io/x/ref/lib/vdl/testdata/...

gen-vdl-impl:
ifndef NOVDLGEN
	rm -rf $(JS_VDL_DIR)
	VDLPATH=$(VDLPATH) v23 go run $(V23_ROOT)/release/go/src/v.io/x/ref/cmd/vdl/main.go generate -lang=javascript \
		-js-relative-path-to-core=$(JS_VDL_PATH_TO_CORE) \
		-js-out-dir=$(JS_VDL_DIR) \
		v.io/x/ref/lib/vdl/testdata/... \
		v.io/x/ref/services/wspr/... \
		v.io/v23/rpc/... \
		v.io/v23/naming/... \
		v.io/v23/verror/... \
		v.io/v23/vom/... \
		$(EXTRA_VDL_PATHS)
	# TODO(bjornick): We build the vdlroot stuff with a different set of command line options because the package
	# path does not equal the directory path of the source file.  This is not ideal, but bjornick and toddw will
	# discuss how to fix this later.
	VDLPATH=$(VDLPATH) v23 go run $(V23_ROOT)/release/go/src/v.io/x/ref/cmd/vdl/main.go generate -lang=javascript \
					-js-relative-path-to-core=../../../$(JS_VDL_PATH_TO_CORE) \
					-js-out-dir=$(JS_VDL_DIR) \
					$(V23_ROOT)/release/go/src/v.io/v23/vdlroot/...
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
	@$(VGO) build -o $(GOBIN)/servicerunner -a -tags wspr v.io/x/ref/cmd/servicerunner
	@$(VGO) build -o $(GOBIN)/principal v.io/x/ref/cmd/principal
	@$(VGO) build -o $(GOBIN)/test_serviced v.io/x/js.core/test_service/test_serviced

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
	@$(RM) -fr dist
	@$(RM) -fr docs
	@$(RM) -fr go/bin
	@$(RM) -fr go/pkg
	@$(RM) -fr node_modules
	@$(RM) -fr npm-debug.log
	@$(RM) -fr tmp
	@$(RM) -fr xunit.xml
	$(MAKE) -C extension clean

DOCSTRAP_LOC:= node_modules/ink-docstrap
docs: $(JS_SRC_FILES) jsdocs/docstrap-template/compiled/site.vanadium.css | node_modules
	# Copy our compiled style template
	cp -f jsdocs/docstrap-template/compiled/site.vanadium.css ${DOCSTRAP_LOC}/template/static/styles
	# Build the docs
	jsdoc $^ --readme ./jsdocs/index.md --configure ./jsdocs/conf.json --template ${DOCSTRAP_LOC}/template --destination $@

# docs-template
#
# Builds the custom Vanadium jsdocs template and rebuilds the docs with it.
# It does so by copying the LESS files we have in jsdocs/styles to docstrap
# and rebuilding the compiled style file by following the "Customization"
# steps: https://github.com/terryweiss/docstrap#customizing-docstrap
# After the build is done, it copies back the compiled style file to our
# folder so it can be checked in and used later.
docs-template: node_modules node_modules/ink-docstrap/node_modules/grunt node_modules/ink-docstrap/bower_components
	# Copy our raw LESS style assets to docstrap
	cp -f jsdocs/docstrap-template/styles/*.* ${DOCSTRAP_LOC}/styles
	# Rebuilt the styles
	cd ${DOCSTRAP_LOC}; ${NODE_BIN}/grunt less
	# Copy back the compiled style file from docstrap
	cp -f ${DOCSTRAP_LOC}/template/static/styles/site.cosmo.css jsdocs/docstrap-template/compiled/site.vanadium.css
	# Rebuild docs
	make docs

node_modules/ink-docstrap/node_modules/grunt:
	cd ${DOCSTRAP_LOC}; npm install

node_modules/ink-docstrap/bower_components:
	cd ${DOCSTRAP_LOC}; ${NODE_BIN}/bower install

# serve-docs
#
# Serve the docs at http://localhost:8020.
serve-docs: docs
	static docs -p 8020

.PHONY: docs-template serve-docs

# Builds the jsdoc and then deploys it to https://staging.jsdoc.v.io
staging-docs: docs
	gsutil -m rsync -d -r ./docs gs://jsdoc.staging.v.io
# Builds the jsdoc and then deploys it to https://staging.v.io
production-docs: docs
	gsutil -m rsync -d -r ./docs gs://jsdoc.v.io
.PHONY: staging-docs production-docs

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
.PHONY: gen-vdl gen-vdl-test gen-vdl-test-expected gen-vdl-impl gen-vdl-test-expected-impl

# Prevent the tests from running in parallel, which causes problems because it
# starts multiple instances of the services at once, and also because it
# interleaves the test output.
.NOTPARALLEL: test-integration test-integration-browser test-integration-node
.NOTPARALLEL: test-unit test-unit-node test-unit-browser
.NOTPARALLEL: test-vdl test-vdl-node test-vdl-browser
