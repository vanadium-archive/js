// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver.htmlreport;

/**
 * Data model for a screenshot image.
 *
 * @author jingjin@google.com
 */
public class ScreenshotData {
  /**
   * The base file name (not including the full path) of the screenshot image file.
   */
  private final String fileName;

  /**
   * The caption of the screenshot.
   */
  private final String caption;

  public ScreenshotData(String fileName, String caption) {
    this.fileName = fileName;
    this.caption = caption;
  }

  public String getFileName() {
    return fileName;
  }

  public String getCaption() {
    return caption;
  }
}
