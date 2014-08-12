# veyron-javascript-api

Veyron JavaScript API is a set of client and server APIs that work in both
NodeJS and browser environments enabling development of Veyron-based applications.


# Building and testing

We use GNU Make for building and testing Veyron.

-Builds and tests everything
make test

-Builds
make build

-Run a specific test
<!-- TODO(jasoncampbell): replace these "vgrunt"s with "make whatever" when
it's ready. -->

./vgrunt test --grep "test name" --tests node_unit,browser_unit
or equivalently
./vgrunt test --grep "test name" --tests unit
also can just run node tests
./vgrunt test --tests node

-Runs a HTTP server and opens the HTML test runners in the browser.
-It does so by keeping the Karma test runner and Chrome open, Karma has a "debug"
-button on the test runner that can be used to debug tests. Karma writes debug
-logs to the console in the browser.
./vgrunt debug_browser --tests browser_integration

-Removes all build and testing artifacts
make clean


# Summary

The entry point to the API is through a module called "veyron", everything else
is considered private and should not be accessed by the users of the API.

The "veyron" modules is exported as a global in the browser JS library and for
NodeJS the "main" property in the "package.json" points to "/src/veyron" making
it the index module and therefore NodeJS users can use
"var veyron = require("veyron")" to gain access to the API.

One of the goals of this project is to only write the code once and have it run
in both NodeJS and Browser. Therefore, specific build and testing steps have been
designed in the project to ensure this goal.


# What does the build do?

I short, the build lints, prepares the files for the browser and runs tests. It:

*jsHints everything.
*Uses a third-party called Browserify to make the NodeJS style files work in the
browser by creating a UMD module called "Veyron"
*Minifies and uglifies the JS file. The result is veyron.min.js that can be
included in the browser.

The build also runs all the specification tests in both NodeJS and also
in Chrome browser. It:
*Uses the Browserify plugin to browserify common and bowser_only test files
*Runs a simple http server and hits the runner.html that includes the
browserified tests with PhantomJS and reports the test results back to grunt.

The build also runs integration tests in both environments. Integration tests are
meant to test the "veyron" entry point and should only be testing the public API.
For integration tests, the build:
*Requires "veyron" and "expect" modules before loading the integration test files
*Runs the test files in NodeJS
*For the browser, combines all the integration tests in a single bundle
*Runs a simple http server and hits the runner.html that includes the
veyron.min.js library and hits it with PhantomJS and reports the test results
back to grunt

# Testing structure and considerations

All the spec and integration tests run in both NodeJS and browser, however since
we can write node-only or browser-only modules, it make sense to be able to
write tests for those modules as well that only run in the supported environment.

Integration tests on the other hand can not be browser or node specific and will
always run in both environments. This is because integration tests are testing
the public veyron API ( methods in ./veyron.js ) which should not be
environment specific. Those methods needs to be lean and delegate more of the
work to other private modules.

Tip: The testing framework tests for leaks in the global namespace in the browser,
most of the time leaks are cause by missing "var" before variable names.

Tip: Best way for debugging tests is by using "make debug". This target will run a
simple test server and open the runner HTML files for both specs and integration
tests in Chrome so you can debug in the browser.
