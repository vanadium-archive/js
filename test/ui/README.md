# Vanadium JavaScript UI Test

## About

The UI tests use the maven architecture. This package manager uses
the build information from pom.xml to compile a WebDriver program.

The UI library in this repository defines VanadiumUITestBase, which
uses WebDriver to run Chrome and install the Vanadium Extension.

It also defines HTMLReporter, which is used to grab screenshots and
generate an HTML report of the WebDriver test.

## Usage

The expected use of the library is to subclass VanadiumUITestBase and
write a JUnit test function. The HTMLReporter should be started at the
beginning of the test and generated upon test completion.

A distinct pom.xml should be written for the tests, and it should
include a dependency to this library.

In order to install and use the Vanadium Extension, it is important to
have the credentials of a Google account. It is not recommended that
these credentials be visible to the public. Maven properties and
environment variables can be used to keep them private.

See release.projects.browser and www for example usages.

## Display Port

To run a test, one will generally set the DISPLAY environment variable
to :0 or run Xvfb at a specific display port. Set this value in the
test project's pom.xml file.

Note that when running with :0, the test will run with the current
display. Mouse and key actions performed during this period will interfere with the WebDriver test.

While :0 is good for watching tests as they run, the screenshots taken
are not guaranteed to be accurate.

## Invoking maven

At least 4 flags are required when running the maven test:
- chromeDriverBin: Location of the Chrome WebDriver binary
- htmlReportsRelativePath: Directory to output an HTML report (relative to $WORKSPACE)
- googleBotUsername: Username for a Google account
- googleBotPassword: Password for that user

Here is an example invocation:
WORKSPACE=$WORKSPACE mvn test \
  -f=$LOCATION_OF_POM_XML \
  -Dtest=$UI_TEST_NAME \
  -DchromeDriverBin=$CHROME_WEBDRIVER \
  -DhtmlReportsRelativePath=$HTML_REPORT_RELATIVE_PATH \
  -DgoogleBotUsername=$BOT_USERNAME \
  -DgoogleBotPassword=$BOT_PASSWORD
