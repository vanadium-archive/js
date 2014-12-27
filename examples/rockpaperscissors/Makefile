VEYRON_JS_API= $(VANADIUM_ROOT)/release/javascript/api

default: browser/lib

# Copy the veyron browser bundle from the node_module dir
browser/lib: node_modules
	cp -rf $</veyron/dist/ $@

node_modules: package.json
	npm install

# Making node_modules a phony target ensures that everytime make is run the
# most recent version of the veyron.js module is pulled down.
.PHONY: node_modules
