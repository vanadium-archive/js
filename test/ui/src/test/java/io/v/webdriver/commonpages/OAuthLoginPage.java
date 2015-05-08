// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver.commonpages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

import io.v.webdriver.Util;
import io.v.webdriver.htmlreport.HTMLReportData;

/**
 * Google OAuth login page.
 *
 * @author jingjin@google.com
 */
public class OAuthLoginPage extends PageBase {
  public OAuthLoginPage(WebDriver driver, HTMLReportData htmlReportData) {
    // This page is often triggered by some other page.
    super(driver, "", htmlReportData);
  }

  public void login() {
    log("OAuth login");
    Util.takeScreenshot("oauth-login.png", "OAuth Login", htmlReportData);
    WebElement btnSignInGoogle = wait.until(ExpectedConditions.elementToBeClickable(
        By.xpath("//button[contains(text(), 'Sign in with a Google Account')]")));
    btnSignInGoogle.click();

    log("Accept access info");
    Util.takeScreenshot("accept-access-info.png", "Accepting Access Info", htmlReportData);
    WebElement btnAccept =
        wait.until(ExpectedConditions.elementToBeClickable(By.id("submit_approve_access")));
    btnAccept.click();
  }
}
