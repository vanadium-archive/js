// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver.commonpages;

import com.google.common.base.Function;

import org.openqa.selenium.By;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import io.v.webdriver.RobotHelper;
import io.v.webdriver.Util;
import io.v.webdriver.htmlreport.HTMLReportData;

import java.awt.AWTException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

import java.util.Set;

/**
 * Vanadium extension caveat tab page.
 *
 * @author jingjin@google.com
 */
public class CaveatTabPage extends PageBase {
  public CaveatTabPage(WebDriver driver,
      HTMLReportData htmlReportData) throws UnsupportedEncodingException {
    super(driver, "", htmlReportData);
  }

  private static final int WAIT_TIME = 60; // 60s wait time

  public void bless() {
    log("Waiting for Caveat Tab...");
    Util.takeScreenshot((TakesScreenshot)driver, "waiting-caveats.png", "Waiting for Caveats", htmlReportData);
    final String mainTabHandle = driver.getWindowHandle();
    // Wait until the corresponding tab is there, which means we should get two window handles.
    // Wait at most 1 minute, then try again once.


    String selectCaveatsTabHandle = null;
    try {
      log("Attempt #1");
      selectCaveatsTabHandle = waitForCaveatTab(mainTabHandle);
    } catch(TimeoutException e) {
      log("Timeout occurred");
      e.printStackTrace();
    }
    if (selectCaveatsTabHandle == null) {
      Util.takeScreenshot((TakesScreenshot)driver, "found-caveats.png", "Found Caveats? No", htmlReportData);
      log("Attempt #2");
      // Refresh the page and try again.
      driver.navigate().refresh(); 
      selectCaveatsTabHandle = waitForCaveatTab(mainTabHandle);
    } else {
      Util.takeScreenshot((TakesScreenshot)driver, "found-caveats.png", "Found Caveats? Yes", htmlReportData);
    }

    driver.switchTo().window(selectCaveatsTabHandle);

    log("Accept blessing");
    // We need to click on the "Bless" button in the "select caveats" page.
    WebElement btnBless =
        wait.until(ExpectedConditions.elementToBeClickable(By.id("submit-caveats")));
    Util.takeScreenshot((TakesScreenshot)driver, "select-caveats.png", "Selecting Caveats", htmlReportData);
    btnBless.click();
    driver.switchTo().window(mainTabHandle);
  }

  // Attempts to wait until the caveat tab page shows up.
  // Returns the handle to it.
  private String waitForCaveatTab(final String mainTabHandle) throws TimeoutException {
    return new WebDriverWait(driver, WAIT_TIME).until(new Function<WebDriver, String>() {
      @Override
      public String apply(WebDriver input) {
        Set<String> handles = driver.getWindowHandles();
        if (handles.size() != 2) {
          return null;
        }
        for (String handle : handles) {
          if (!handle.equals(mainTabHandle)) {
            return handle;
          }
        }
        return null;
      }
    });
  }
}
