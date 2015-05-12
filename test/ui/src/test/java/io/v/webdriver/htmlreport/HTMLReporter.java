// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver.htmlreport;

import freemarker.template.Configuration;
import freemarker.template.Template;
import freemarker.template.TemplateExceptionHandler;

import io.v.webdriver.Util;

import java.io.File;
import java.io.FileWriter;
import java.io.Writer;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Generate HTML report that has screenshots of all test steps.
 *
 * @author jingjin@google.com
 */
public class HTMLReporter {
  private final String reportFileName;
  private final HTMLReportData data;

  public HTMLReporter(HTMLReportData data) {
    this.reportFileName = String.format("%s.html", Util.getSafeFilename(data.getTestName()));
    this.data = data;
  }

  public void generateReport() throws Exception {
    // Setup and load template.
    Configuration cfg = new Configuration(Configuration.VERSION_2_3_22);
    cfg.setClassForTemplateLoading(this.getClass(), "");
    cfg.setDefaultEncoding("UTF-8");
    cfg.setLocale(Locale.US);
    cfg.setTemplateExceptionHandler(TemplateExceptionHandler.RETHROW_HANDLER);

    // Figure out where the report.ftl file is.
    File f = new File(System.getenv("V23_ROOT") + "/release/javascript/core/test/ui/src/test/java/io/v/webdriver/htmlreport");
    String path = f.getAbsolutePath();
    cfg.setDirectoryForTemplateLoading(new File(path));

    // This template formats the HTML report.
    Template template = cfg.getTemplate("report.ftl");

    // Prepare data.
    Map<String, Object> input = new HashMap<String, Object>();
    input.put("data", data);

    // Generate output.
    String reportPath = String.format("%s/%s", data.getReportDir(), reportFileName);
    Writer fileWriter = new FileWriter(new File(reportPath));
    try {
      template.process(input, fileWriter);
    } finally {
      fileWriter.close();
    }
  }
}
