// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver;

import org.junit.rules.TestWatcher;
import org.junit.runner.Description;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriverService;

import io.v.webdriver.htmlreport.HTMLReportData;
import io.v.webdriver.htmlreport.HTMLReporter;

/**
 * A class for performing actions when any test case fails.
 *
 * @author jingjin@google.com
 */
public class TestFailureWatcher extends TestWatcher {
  private VanadiumUITestBase uiTest;
  private WebDriver driver;
  private ChromeDriverService service;

  public void setup(VanadiumUITestBase uiTest, WebDriver driver, ChromeDriverService service) {
    this.uiTest = uiTest;
    this.driver = driver;
    this.service = service;
  }

  @Override
  protected void failed(Throwable e, Description description) {
    // Take a screenshot for the current screen and write the html report.
    HTMLReportData data = uiTest.getCurrentHTMLReportData();
    Util.takeScreenshot((TakesScreenshot)driver, "test-failed.png", "Test Failed", data);
    HTMLReporter reporter = new HTMLReporter(data);
    try {
      reporter.generateReport();
    } catch (Exception e1) {
      System.err.println("Failed to write html report.\n" + Util.getStackTrace(e1));
    }
  }

  @Override
  protected void finished(Description description) {
    driver.quit();
    service.stop();
  }
}
