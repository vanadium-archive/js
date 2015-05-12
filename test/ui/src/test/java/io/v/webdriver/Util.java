// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver;

import io.v.webdriver.htmlreport.HTMLReportData;

import java.io.PrintWriter;
import java.io.StringWriter;

/**
 * Utility functions.
 *
 * @author jingjin@google.com
 */
public class Util {

  /**
   * Sleeps for given milliseconds.
   *
   * <p>This is mainly used for waiting between Robot related operations. For WebDriver, we should
   * use "wait.until".
   *
   * @param ms number of milliseconds to sleep.
   */
  public static void sleep(int ms) {
    try {
      Thread.sleep(ms);
    } catch (InterruptedException e) {
      e.printStackTrace();
    }
  }

  /**
   * Converts the given exception's stack trace to a string.
   *
   * @param e the exception to convert to string.
   */
  public static String getStackTrace(Exception e) {
    StringWriter sw = new StringWriter();
    PrintWriter pw = new PrintWriter(sw);
    e.printStackTrace(pw);
    return sw.toString();
  }

  /**
   * Replaces illegal character in the given file name.
   *
   * @param filename the original file name.
   */
  public static String getSafeFilename(String filename) {
    return filename.replaceAll("[^a-zA-Z0-9.-]", "_").toLowerCase();
  }

  /**
   * Takes a screenshot.
   *
   * <p>It uses the "import" command, saves it to the given file, and records it in the given
   * htmlReportData.
   *
   * @param fileName the file to save the screenshot to.
   * @param caption the caption of the screenshot.
   * @param htmlReportData the data model to add screenshot data to.
   */
  public static void takeScreenshot(String fileName, String caption,
      HTMLReportData htmlReportData) {
    String fullFileName =
        String.format("%s-%s", getSafeFilename(htmlReportData.getTestName()), fileName);
    Runtime rt = Runtime.getRuntime();
    try {
      String imagePath = String.format("%s/%s", htmlReportData.getReportDir(), fullFileName);
      Process pr = rt.exec(
          String.format("import -window root -crop 1004x748+10+10 -resize 800 %s", imagePath));
      int retValue = pr.waitFor();
      if (retValue != 0) {
        System.err.println(String.format("Failed to capture screenshot: %s", imagePath));
      }
    } catch (Exception e) {
      e.printStackTrace();
    }

    htmlReportData.addScreenshotData(fullFileName, caption);
  }
}
