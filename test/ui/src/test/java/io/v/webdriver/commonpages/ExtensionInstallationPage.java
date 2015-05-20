// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver.commonpages;

import org.openqa.selenium.By;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

import io.v.webdriver.RobotHelper;
import io.v.webdriver.Util;
import io.v.webdriver.htmlreport.HTMLReportData;

import java.awt.AWTException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

/**
 * Vanadium extension installation page.
 *
 * @author jingjin@google.com
 */
public class ExtensionInstallationPage extends PageBase {
  private static final String GOOGLE_LOGIN_URL = "https://accounts.google.com/ServiceLogin";

  public ExtensionInstallationPage(WebDriver driver, String extentionUrl,
      HTMLReportData htmlReportData) throws UnsupportedEncodingException {
    super(driver, GOOGLE_LOGIN_URL + "?continue=" + URLEncoder.encode(extentionUrl, "UTF-8"),
        htmlReportData);
  }

  public void login(String password) throws TimeoutException {
    log("Log in using Google account");
    WebElement btnSignin = wait.until(ExpectedConditions.elementToBeClickable(By.id("signIn")));
    WebElement passwdTextField = driver.findElement(By.id("Passwd"));
    passwdTextField.sendKeys(password);
    Util.takeScreenshot((TakesScreenshot)driver, "google-account-signin.png", "Google Account Sign-In", htmlReportData);
    btnSignin.click();
  }

  public void install() throws AWTException, TimeoutException {
    log("Install extension");
    WebElement btnAddToChrome = wait.until(
        ExpectedConditions.elementToBeClickable(By.cssSelector("div[aria-label='Add to Chrome']")));
    Util.takeScreenshot((TakesScreenshot)driver, "before-install-extension.png", "Before Installing Extension",
        htmlReportData);
    btnAddToChrome.click();
    Util.sleep(2000);

    // Click on the "Add" button in the extension installation popup.
    // This popup is not accessible by WebDriver.
    log("Confirm adding extension to Chrome");
    RobotHelper robotHelper = RobotHelper.sharedInstance();
    robotHelper.tab();
    robotHelper.enter();
    wait.until(ExpectedConditions.elementToBeClickable(
        By.cssSelector("div[aria-label='Added to Chrome']")));
    // It might take some time for the extension to actually be installed.
    Util.sleep(3000);
    Util.takeScreenshot((TakesScreenshot)driver, "after-install-extension.png", "After Installing Extension",
        htmlReportData);
  }
}
