// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver.commonpages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;

import io.v.webdriver.Util;
import io.v.webdriver.htmlreport.HTMLReportData;

/**
 * Vanadium extension's option page.
 *
 * @author jingjin@google.com
 */
public class ExtensionOptionPage extends PageBase {
  private static final String URL_OPTIONS =
      "chrome-extension://jcaelnibllfoobpedofhlaobfcoknpap/html/options.html";

  public ExtensionOptionPage(WebDriver driver, HTMLReportData htmlReportData) {
    super(driver, URL_OPTIONS, htmlReportData);
  }

  @Override
  public void go() {
    super.goWithoutTakingScreenshot();

    // For this page we need to do an extra refresh once to make the page appear.
    driver.navigate().refresh();
    Util.sleep(1000);
    takeScreenshotUsingPageName();

    // Verify the "Reload plugin" link is present.
    wait.until(ExpectedConditions.presenceOfElementLocated(By.linkText("Reload plugin")));
  }
}
