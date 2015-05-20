// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver.commonpages;

import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;

import io.v.webdriver.Util;
import io.v.webdriver.htmlreport.HTMLReportData;

/**
 * Base page class.
 *
 * @author jingjin@google.com
 */
public class PageBase {
  /**
   * Default timeout in seconds for WebDriver to wait for a condition.
   */
  public static final int TIMEOUT_SECONDS = 10;

  /**
   * Page URL.
   */
  private String url;

  /**
   * Informative page name used in logging.
   */
  private final String pageName;

  protected final WebDriver driver;

  protected final WebDriverWait wait;

  protected final HTMLReportData htmlReportData;

  public PageBase(WebDriver driver, String url, HTMLReportData htmlReportData) {
    this.driver = driver;
    this.url = url;
    this.htmlReportData = htmlReportData;
    this.pageName = this.getClass().getSimpleName();

    wait = new WebDriverWait(driver, TIMEOUT_SECONDS);
  }

  public void go() {
    goWithoutTakingScreenshot();
    takeScreenshotUsingPageName();
  }

  public void goWithoutTakingScreenshot() {
    log("Go to " + url);
    driver.get(url);
  }

  protected void log(String msg) {
    System.out.println(String.format("[%s]: %s", pageName, msg));
  }

  /**
   * Takes a screenshot for the current page and names it using pageName.
   */
  protected void takeScreenshotUsingPageName() {
    Util.takeScreenshot((TakesScreenshot)driver, String.format("%s.png", Util.getSafeFilename(pageName)), pageName,
        htmlReportData);
  }
}
