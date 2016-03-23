NODE_BIN := $(shell jiri profile env --profiles=v23:base,v23:nodejs NODE_BIN=)
PATH := node_modules/.bin:$(NODE_BIN):$(PATH)

NODE_MODULES_BIN := $(JIRI_ROOT)/release/javascript/core/node_modules/.bin
VDLPATH := $(JIRI_ROOT)/release/go/src:$(GOPATH)/src
VDLROOT := $(JIRI_ROOT)/release/go/src/v.io/v23/vdlroot
VGO := GOPATH="$(GOPATH)" VDLPATH="$(VDLPATH)" jiri go
GO_FILES := $(shell find $(JIRI_ROOT)/release/go/src/v.io -name "*.go")

NODE_MODULE_JS_FILES := $(shell find node_modules -name *.js | sed 's/ /\\ /')

SHELL := /bin/bash -e -o pipefail

UNAME := $(shell uname)

# NOTE: we run npm using 'node npm' to avoid relying on the shebang line in the
# npm script, which can exceed the Linux shebang length limit on Jenkins.
NPM := $(NODE_BIN)/npm

.DEFAULT_GOAL := all

ifdef XUNIT
	OUTPUT_TRANSFORM := tap-xunit
endif

ifdef NODE_OUTPUT
	NODE_OUTPUT_LOCAL = $(NODE_OUTPUT)
	ifdef OUTPUT_TRANSFORM
		NODE_OUTPUT_LOCAL := >($(OUTPUT_TRANSFORM) --package=javascript.node > $(NODE_OUTPUT_LOCAL))
	endif
	NODE_OUTPUT_LOCAL := | tee $(NODE_OUTPUT_LOCAL)
endif

JS_SRC_FILES = $(shell find src -name "*.js" | sed 's/ /\\ /')

all: gen-vdl lint build docs

build: docs

test-precheck: gen-vdl-test node_modules lint dependency-check

test: test-unit test-vdl test-vom

test-vdl: test-vdl-node

# This generates the VDL files and asks git if there are any changed files.
# The alternative is to use the vdl audit command, but that requires checking
# after both vdl commands in gen-vdl-impl as opposed to a single git status.
test-vdl-audit: gen-vdl
	@if [ "`git status --porcelain | grep ' src/gen-vdl/' | sed 's/^ //'`" != "" ]; then \
	  echo "Some VDL files changed but were not committed!"; \
	  echo "`git status --porcelain | grep ' src/gen-vdl/' | sed 's/^ //'`"; \
	  echo "Run 'make gen-vdl' in the javascript/core repo, and commit the changed files."; \
	  exit 1; \
	fi

test-vom: test-vom-node

# This generates the output of the vdl files in src/gen-vdl/v.io/<package-path>
# The command will generate all the dependent files as well.
gen-vdl: JS_VDL_DIR := "$(JIRI_ROOT)/release/javascript/core/src/gen-vdl"
gen-vdl: JS_VDL_PATH_TO_CORE := ".."
gen-vdl: gen-vdl-impl

# This generates the output of the vdl files in test/vdl-out/gen-vdl/v.io/<package-path>
# The command will generate all the dependent files as well.
gen-vdl-test: JS_VDL_DIR := "$(JIRI_ROOT)/release/javascript/core/test/vdl-out"
gen-vdl-test: EXTRA_VDL_PATHS := "javascript-test/..."
gen-vdl-test: VDLPATH := "$(JIRI_ROOT)/release/go/src:$(JIRI_ROOT)/release/javascript/core/test/vdl-in/src"
gen-vdl-test: JS_VDL_PATH_TO_CORE := "../../src"
gen-vdl-test: gen-vdl-impl

# This generates the vdl files used by test/vom/test-vdl-arith.js
# They are placed in test/vdl/expected-gen/v.io/<package-path>.
# This command is not normally run by the tests. It should only be run when the
# expected vdl files need to be updated.
gen-vdl-test-expected: JS_VDL_DIR := "$(JIRI_ROOT)/release/javascript/core/test/vdl/expected-gen"
gen-vdl-test-expected: JS_VDL_PATH_TO_CORE := "../../../src"
gen-vdl-test-expected: gen-vdl-test-expected-impl

gen-vdl-test-expected-impl:
	rm -rf $(JS_VDL_DIR)
	echo $(VDLPATH)
	VDLPATH=$(VDLPATH) VDLROOT=$(VDLROOT) vdl generate -lang=javascript \
		-js-relative-path-to-core=$(JS_VDL_PATH_TO_CORE) \
		-js-out-dir=$(JS_VDL_DIR) \
		v.io/x/ref/lib/vdl/testdata/...

gen-vdl-impl:
ifndef NOVDLGEN
	rm -rf $(JS_VDL_DIR)
	VDLPATH=$(VDLPATH) VDLROOT=$(VDLROOT) vdl generate -lang=javascript \
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
	VDLPATH=$(VDLPATH) VDLROOT=$(VDLROOT) vdl generate -lang=javascript \
		-js-relative-path-to-core=../../../$(JS_VDL_PATH_TO_CORE) \
		-js-out-dir=$(JS_VDL_DIR) \
		$(VDLROOT)/...
endif

test-vdl-node: test-precheck
	tape test/vdl/test-*.js $(NODE_OUTPUT_LOCAL)

test-vom-node: test-precheck
	tape test/vom/test-*.js $(NODE_OUTPUT_LOCAL)

test-unit: test-unit-node

test-unit-node: test-precheck
	tape test/unit/test-*.js $(NODE_OUTPUT_LOCAL)

lint: node_modules
ifdef NOLINT
	@echo "Skipping lint - disabled by NOLINT environment variable"
else
	jshint .
endif

dependency-check: node_modules
	dependency-check package.json --entry src/vanadium.js

clean:
	@$(RM) -fr docs
	@$(RM) -fr node_modules
	@$(RM) -fr npm-debug.log
	@$(RM) -fr tmp
	@$(RM) -fr xunit.xml

DOCSTRAP_LOC:= node_modules/ink-docstrap
docs: $(JS_SRC_FILES) jsdocs/docstrap-template/compiled/site.vanadium.css | node_modules
	# Copy our compiled style template
	cp -f jsdocs/docstrap-template/compiled/site.vanadium.css ${DOCSTRAP_LOC}/template/static/styles

	# Build the docs
	jsdoc $^ --readme ./jsdocs/index.md --configure ./jsdocs/conf.json --template ${DOCSTRAP_LOC}/template --destination $@

	# Copy favicon
	cp -f ./jsdocs/favicon.ico $@

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
	cd ${DOCSTRAP_LOC}; ${NODE_MODULES_BIN}/grunt less
	# Copy back the compiled style file from docstrap
	cp -f ${DOCSTRAP_LOC}/template/static/styles/site.cosmo.css jsdocs/docstrap-template/compiled/site.vanadium.css
	# Rebuild docs
	make docs

node_modules/ink-docstrap/node_modules/grunt:
	cd ${DOCSTRAP_LOC}; node $(NPM) install

node_modules/ink-docstrap/bower_components:
	cd ${DOCSTRAP_LOC}; ${NODE_MODULES_BIN}/bower install

# serve-docs
#
# Serve the docs at http://localhost:8020.
serve-docs: docs
	static docs -p 8020

.PHONY: docs-template serve-docs

.PHONY: deploy-docs-production
deploy-docs-production: docs
	make -C $(JIRI_ROOT)/infrastructure/deploy jsdoc-production

.PHONY: deploy-docs-staging
deploy-docs-staging: docs
	make -C $(JIRI_ROOT)/infrastructure/deploy jsdoc-staging

node_modules: package.json  check-that-npm-is-in-path
ifndef NONPMUPDATE
	@node $(NPM) prune
	@node $(NPM) install --quiet || (rm -fr $(HOME)/.npm && node $(NPM) install --quiet)
	@touch node_modules
endif

check-that-npm-is-in-path:
	@which npm > /dev/null || { echo "npm is not in the path. Did you remember to run 'jiri profile install v23:nodejs'?"; exit 1; }

.PHONY: all build clean dependency-check lint test
.PHONY: test-unit test-unit-node
.PHONY: check-that-npm-is-in-path
.PHONY: gen-vdl gen-vdl-test gen-vdl-test-expected gen-vdl-impl gen-vdl-test-expected-impl

# Prevent the tests from running in parallel, which causes problems because it
# starts multiple instances of the services at once, and also because it
# interleaves the test output.
.NOTPARALLEL: test-unit test-unit-node
.NOTPARALLEL: test-vdl test-vdl-node
