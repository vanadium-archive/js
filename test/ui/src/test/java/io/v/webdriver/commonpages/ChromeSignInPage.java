// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver.commonpages;

import org.openqa.selenium.WebDriver;

import io.v.webdriver.RobotHelper;
import io.v.webdriver.Util;
import io.v.webdriver.htmlreport.HTMLReportData;

import java.awt.AWTException;

/**
 * Chrome's native Sign-In page.
 *
 * @author jingjin@google.com
 */
public class ChromeSignInPage extends PageBase {
  private static final String URL_CHROME_SIGNIN = "chrome://chrome-signin";

  public ChromeSignInPage(WebDriver driver, HTMLReportData htmlReportData) {
    super(driver, URL_CHROME_SIGNIN, htmlReportData);
  }

  @Override
  public void go() {
    super.goWithoutTakingScreenshot();

    // For this page we need to wait a little bit before entering username/password.
    Util.sleep(2000);
    takeScreenshotUsingPageName();
  }

  public void signIn(String username, String password) throws AWTException {
    // Sign in.
    log("Sign in");
    RobotHelper robotHelper = RobotHelper.sharedInstance();
    robotHelper.enterText(username);
    robotHelper.tab();
    robotHelper.enter();
    robotHelper.enterText(password);
    robotHelper.tab();
    Util.takeScreenshot("before-chrome-signin.png", "Before Signing In Chrome", htmlReportData);
    robotHelper.enter();
    Util.sleep(2000);

    // Dismiss a "Sign-in successful" popup.
    // This popup is not accessible by WebDriver.
    log("Dismiss 'Sign-in successful' prompt");
    robotHelper.enter();
    Util.takeScreenshot("after-chrome-signin.png", "After Signing In Chrome", htmlReportData);
  }
}
