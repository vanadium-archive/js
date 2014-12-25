PATH:=$(VANADIUM_ROOT)/environment/cout/node/bin:../../node_modules/.bin:$(PATH)

public/server/bundle.js: lib/server.js ../../node_modules
	browserify $< --debug --outfile $@

public/client/bundle.js: lib/client.js ../../node_modules
	browserify $< --debug --outfile $@

../../node_modules:
	npm install

run: public/server/bundle.js public/client/bundle.js
	@echo Client will be at http://localhost:8080/server/index.html
	@echo Server will be at http://localhost:8080/client/index.html
	static "public" -H '{"Cache-Control": "no-cache, must-revalidate"}'

# Clean all build artifacts
clean:
	rm -rf public/server/bundle.js public/client/bundle.js ../../node_modules

.PHONY: clean run
