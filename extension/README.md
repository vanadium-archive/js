# The Veyron Extension

## Developing with an unpacked extension:
    $ make

This will build an unpacked extension in the ./extension directory.

To load the unpacked extension in Chrome:
1. Click Hamburger menu -> Tools -> Extensions
2. Click "Load unpacked extension..."
3. Navigate to ./extension and click "OK".

## Publishing a new version of the extension:

Note: You must be a member of the vanadium-extension-managers group to publish.

1. Bump the version number in manifest.json.
2. Build a zip file with "make veyron.zip"
3. Upload and publish the extension on https://chrome.google.com/webstore/developer/dashboard

## Running the example server
    $ make example-server

This will run an example web app at http://localhost:8080.  The web app has a
log-in button that communicates with the extension to start the blessing flow.
