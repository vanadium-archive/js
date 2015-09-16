# Vanadium JavaScript

This repository defines the JavaScript API for Vanadium.
The client and server APIs defined here work both in [Node.js] and the browser.

## Install

## Install
Since Vanadium is currently hosted in private repositories, you would need to
[setup SSH keys for Github]
(https://help.github.com/articles/generating-ssh-keys/)
first and then use npm to install directly from GitHub:

    npm install --save git+ssh://git@github.com:vanadium/js.git

## Usage

Documentation for this API is available at https://jsdoc.v.io/

The entry point to the API is through a module called `vanadium`, everything
else is considered private and should not be accessed by the users of the API.

The `vanadium` module is exported as a global in the browser JavaScript library and for
[Browserify] and [Node.js] the "main" property in the `package.json` points to `/src/vanadium` making it the index module and therefore [Browserify] and [Node.js] users can gain access to the API with:

    var vanadium = require("vanadium");

One of the goals of this project is to only write the code once and have it run
in both [Node.js] and browsers. Therefore, specific build and testing steps
have been designed in the project to ensure this goal.

When run in a browser, `vanadium.js` expects that the [vanadium
extension](https://github.com/vanadium/docs/blob/master/tools/vanadium-chrome-extension.md)
will be installed.

## Bugs and feature requests

Bugs and feature requests should be filed in the [Vanadium issue tracker](https://github.com/vanadium/issues/issues).

## Building and testing

GNU Make is used to build and test Vanadium.

Build everything:

    make build

Test everything:

    make test

Run a specific test suite:

    make test-unit
    make test-unit-node
    make test-unit-browser

    make test-integration
    make test-integration-node
    make test-integration-browser

Remove all build and testing artifacts:

    make clean

[Node.js]: https://nodejs.org/
[Browserify]: http://browserify.org/
