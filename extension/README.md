# The Veyron Extension

## Goals:
### Short-term: Extension provides UI to manage identities
WSPR holds on to all private keys and never exposes them.  The extension works
with WSPR to manage identities.  A webapp should not be able to see all
identities known to WSPR.

An auth flow will look something like this.
1. Webapp requests a blessing from the extension.
2. Extension pops up some UI to let the user pick an existing blessing, or create a new one.
3a. If the user picks an existing blessing:
    WSPR associates that blessing with the user and the webapp's domain.
    All veyron RPCs from this webapp will use that blessing.
    Done.
3b. If the user chooses to create a new blessing:
    Extension UI kicks off OAuth flow.
    ...whirlpool of despair...
    WSPR ends up with a blessing, and associates that blessing with the user and webapp's domain.
    All veyron RPCs from this webapp will use that blessing.
    Done.

The extension should also provide a way to remove identities from WSPR.

### Long-term: Fold WSPR into extension
Compile WSPR to NaCl and include it as a plugin in the extension.


## Developing with an unpacked extension:
    $ make

This will build an unpacked extension in the ./extension directory.

To load the unpacked extension in Chrome:
1. Click Hamburger menu -> Tools -> Extensions
2. Click "Load unpacked extension..."
3. Navigate to ./extension and click "OK".


## Packaging the extension
    $ make veyron.crx

This will package the extension into veyron.crx, which can be distributed and
installed by opening the veyron.crx file in Chrome.

NOTE: Chrome extensions are signed.  There is a development certificate in
dev-cert.pem.  We need to make a new, secure certificate before releasing.
This certificate should obviously not live in the repository.

## Running the example server
    $ make example-server

This will run an example web app at http://localhost:8080.  The web app has a
log-in button that communicates with the extension to start the blessing flow.
