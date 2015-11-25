// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver;


import org.junit.Before;
import org.junit.Rule;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeDriverService;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.logging.LogEntries;
import org.openqa.selenium.logging.LogEntry;
import org.openqa.selenium.logging.LogType;
import org.openqa.selenium.logging.LoggingPreferences;
import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.DesiredCapabilities;

import io.v.webdriver.Util;
import io.v.webdriver.htmlreport.HTMLReportData;
import io.v.webdriver.commonpages.ChromeSignInPage;
import io.v.webdriver.commonpages.CaveatTabPage;
import io.v.webdriver.commonpages.ExtensionInstallationPage;
import io.v.webdriver.commonpages.ExtensionOptionPage;

import java.io.File;
import java.io.IOException;
import java.util.Date;
import java.util.logging.Level;

/**
 * The base class for all Vanadium UI tests.
 *
 * @author jingjin@google.com
 */
public class VanadiumUITestBase {
  /**
   * System property name for Chrome driver binary. This will be set from the mvn command line.
   */
  private static final String PROPERTY_CHROME_DRIVER_BIN = "chromeDriverBin";

  /**
   * System property name for html report path relative to Jenkins workspace dir. This will be set
   * from the mvn command line.
   */
  private static final String PROPERTY_HTML_REPORTS_RELATIVE_PATH = "htmlReportsRelativePath";

  /**
   * System property name for the bot username and bot password. These will be set from the mvn command line.
   */
  private static final String PROPERTY_GOOGLE_BOT_USERNAME = "googleBotUsername";
  private static final String PROPERTY_GOOGLE_BOT_PASSWORD = "googleBotPassword";

  /**
   * System property name for the path to the Vanadium extension. Optional.
   */
  private static final String PROPERTY_VANADIUM_EXTENSION_PATH = "vanadiumExtensionPath";
  protected boolean hasExtension;

  /**
   * The base dir to store html reports
   */
  protected final String htmlReportsDir;

  /**
   * A variable to keep track of the current htmlReportData.
   */
  protected HTMLReportData curHTMLReportData;

  /**
   * The username and password of the bot account used to sign in to Google/Chrome.
   */
  protected String botUsername;
  protected String botPassword;

  /**
   * Vanadium extension installation url.
   */
  private static final String URL_EXTENSION = "https://chrome.google.com/webstore/detail/"
      + "vanadium-extension/jcaelnibllfoobpedofhlaobfcoknpap";

  protected ChromeDriverService service;

  protected WebDriver driver;

  public VanadiumUITestBase() {
    htmlReportsDir = createReportsDir();
  }

  /**
   * This "Rule" is used to catch failed test cases so we can act on it.
   */
  @Rule
  public TestFailureWatcher testFailureWatcher = new TestFailureWatcher();

  /**
   * Basic WebDriver and other setup tasks. This will be executed before each test case.
   */
  @Before
  public void setup() throws IOException {
    // TODO(alexfandrianto): Used to debug the IP address of the machine. Possibly remove.
    Util.printIPAddresses();

    String chromeDriverBin = System.getProperty(PROPERTY_CHROME_DRIVER_BIN);
    botUsername = System.getProperty(PROPERTY_GOOGLE_BOT_USERNAME);
    botPassword = System.getProperty(PROPERTY_GOOGLE_BOT_PASSWORD);
    System.out.println("ChromeDriver binary: " + chromeDriverBin);
    service = new ChromeDriverService.Builder().usingDriverExecutable(new File(chromeDriverBin))
        .usingAnyFreePort().build();
    service.stop();
    service.start();

    // Set up the ability to grab the console.log from the browser.
    DesiredCapabilities capabilities = DesiredCapabilities.chrome();
    LoggingPreferences logPrefs = new LoggingPreferences();
    logPrefs.enable(LogType.BROWSER, Level.ALL);
    capabilities.setCapability(CapabilityType.LOGGING_PREFS, logPrefs);

    // If an extension was chosen, use that.
    String vanadiumExtensionPath = System.getProperty(PROPERTY_VANADIUM_EXTENSION_PATH);
    if (vanadiumExtensionPath != null) {
      ChromeOptions options = new ChromeOptions();
      options.addArguments("load-extension=" + System.getProperty("vanadiumExtensionPath"));

      capabilities.setCapability(ChromeOptions.CAPABILITY, options);
      hasExtension = true;
    }

    // Create the driver and start using it.
    driver = new ChromeDriver(service, capabilities);
    driver.manage().window().maximize();

    testFailureWatcher.setup(this, driver, service);
  }

  public HTMLReportData getCurrentHTMLReportData() {
    return curHTMLReportData;
  }

  private String createReportsDir() {
    String workspaceRoot = System.getenv("WORKSPACE");
    if (workspaceRoot == null) {
      workspaceRoot = System.getenv("HOME");
    }
    if (workspaceRoot == null) {
      return "";
    }
    String reportsDir = String.format("%s/%s", workspaceRoot,
        System.getProperty(PROPERTY_HTML_REPORTS_RELATIVE_PATH, "htmlReports"));
    File reportsFile = new File(reportsDir);
    if (!reportsFile.exists()) {
      if (reportsFile.mkdirs()) {
        System.out.println(String.format("Reports dir '%s' created", reportsDir));
      } else {
        throw new RuntimeException(String.format("Failed to create reports dir '%s'", reportsDir));
      }
    }
    return reportsDir;
  }

  /**
   * Grab all of the log entries from the browser and print them out.
   */
  public void printConsoleLogs() {
    LogEntries logEntries = driver.manage().logs().get(LogType.BROWSER);
    for (LogEntry entry : logEntries) {
        System.out.println(new Date(entry.getTimestamp()) + " " + entry.getLevel() + " " + entry.getMessage());
    }
  }

  /**
   * Sign in and install the extension, if necessary.
   * A simple wrapper around signIn and installExtension.
   */
  protected void signInAndInstallExtension(HTMLReportData reportData) throws Exception {
    signIn(reportData);
    if (!this.hasExtension) {
      installExtension(reportData);
    }
  }

  /**
   * Sign into Chrome. This is needed to use the extension.
   */
  protected void signIn(HTMLReportData reportData) throws Exception {
    // Sign into Chrome.
    ChromeSignInPage chromeSignInPage = new ChromeSignInPage(driver, reportData);
    chromeSignInPage.go();
    chromeSignInPage.signIn(botUsername, botPassword);
  }

  /**
   * UI tests will commonly need to install the extension.
   * The process involves installing the extension and
   * verifying that it was installed successfully.
   */
  protected void installExtension(HTMLReportData reportData) throws Exception {
    // Install Vanadium extension.
    ExtensionInstallationPage extensionInstallationPage =
        new ExtensionInstallationPage(driver, URL_EXTENSION, reportData);
    extensionInstallationPage.go();
    extensionInstallationPage.login(botPassword);
    extensionInstallationPage.install();

    hasExtension = true;

    // Check Vanadium extension option page.
    Util.sleep(4000);
    ExtensionOptionPage extensionOptionPage = new ExtensionOptionPage(driver, reportData);
    extensionOptionPage.go();
  }

  /**
   * UI tests will commonly need to bypass a caveat page.
   */
  protected void handleCaveatTab(HTMLReportData reportData) throws Exception {
    CaveatTabPage caveatTabPage = new CaveatTabPage(driver, reportData);
    caveatTabPage.bless();
  }
}
