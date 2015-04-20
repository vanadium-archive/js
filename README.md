# Vanadium JavaScript

This repository defines the JavaScript API for [Vanadium].
The client and server APIs defined here work both in [Node.js] and the browser.

## Install

`npm` can be used to install this library:

    npm install --save git@github.com:vanadium/js.git

## Building and testing

GNU Make is used to build and test [Vanadium].

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

## Usage

Documentation for this API is available at https://jsdoc.v.io/

The entry point to the API is through a module called `vanadium`, everything
else is considered private and should not be accessed by the users of the API.

The `vanadium` module is exported as a global in the browser JavaScript library and for
[Node.js] the "main" property in the `package.json` points to `/src/vanadium` making
it the index module and therefore [Node.js] users can gain access to the API with:

    var vanadium = require("vanadium");

One of the goals of this project is to only write the code once and have it run
in both [Node.js] and browsers. Therefore, specific build and testing steps
have been designed in the project to ensure this goal.

When run in a browser, `vanadium.js` expects that the [vanadium
extension](https://v.io/tools/vanadium-chrome-extension.html) will be
installed.

## Bugs and feature requests

Bugs and feature requests should be filed in the [Vanadium issue tracker](https://github.com/vanadium/issues/issues).

[Vanadium]: https://v.io/
[Node.js]: https://nodejs.org/
