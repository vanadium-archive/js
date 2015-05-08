// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver.htmlreport;

import java.util.ArrayList;
import java.util.List;

/**
 * Data model class for used in HTML report generation.
 *
 * @author jingjin@google.com
 */
public class HTMLReportData {
  /**
   * A list of screenshots in the report.
   */
  private final List<ScreenshotData> screenshots = new ArrayList<ScreenshotData>();

  /**
   * The report's base dir.
   */
  private final String reportDir;

  /**
   * The name of the test associated with the data.
   */
  private final String testName;

  public HTMLReportData(String testName, String reportDir) {
    this.testName = testName;
    this.reportDir = reportDir;
  }

  public String getReportDir() {
    return reportDir;
  }

  public String getTestName() {
    return testName;
  }

  public void addScreenshotData(String fileName, String caption) {
    screenshots.add(new ScreenshotData(fileName, caption));
  }

  public List<ScreenshotData> getScreenshots() {
    return screenshots;
  }
}
