# Veyron JS

Veyron JavaScript API is a set of client and server APIs that work in both
NodeJS and browser environments enabling development of Veyron-based applications.

## Install

You can install this library using npm:

    npm install --save git@github.com:veyron/release/javascript/core.git

We are using a private github repo up until the initial release. The npm CLI
knows how to deal with [github urls] but you will need to make sure you have
a [github account][github], that your [ssh keys are setup][ssh setup] and
that you have been added to the [veyron github organization][github/veyron].

If you would like to pin to a specific version or sha use the # notation at the end of the github url:

    npm install --save git@github.com:veyron/release/javascript/core.git#d75035

See also: [NPM Git URLs as Dependencies][github urls]

[github urls]: https://www.npmjs.org/doc/files/package.json.html#git-urls-as-dependencies
[github]: github.com/
[ssh setup]: https://help.github.com/articles/generating-ssh-keys
[github/veyron]: https://github.com/veyron

# Building and testing

We use GNU Make for building and testing Veyron.

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

When run in a browser, release/javascript/core expects that the veyron extension will be
installed. The veyron extension is responsible for getting an oauth2 access
token from the user and sending it to WSPR.  WSPR will use the access token to
get a blessed identity from the identity server, and will use that identity for
all requests coming from release/javascript/core's origin.
