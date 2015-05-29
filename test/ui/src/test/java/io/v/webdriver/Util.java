// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver;

import io.v.webdriver.htmlreport.HTMLReportData;

import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;

import java.io.File;
import java.io.FileOutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.Enumeration;

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
   * <p>It uses the WebDriver to grab the screenshot data, saves it to the given file,
   * and records it in the given htmlReportData.
   *
   * @param TakesScreenshot a driver that can getScreenshotAs, such as a ChromeDriver.
   * @param fileName the file to save the screenshot to.
   * @param caption the caption of the screenshot.
   * @param htmlReportData the data model to add screenshot data to.
   */
  public static void takeScreenshot(TakesScreenshot taker, String fileName,
    String caption, HTMLReportData htmlReportData) {

    String fullFileName =
      String.format("%s-%s", getSafeFilename(htmlReportData.getTestName()), fileName);
    Runtime rt = Runtime.getRuntime();
    try {
      byte[] imageData = taker.getScreenshotAs(OutputType.BYTES); // throws WebDriverException
      File imageFile = new File(htmlReportData.getReportDir(), fullFileName);
      FileOutputStream fos = new FileOutputStream(imageFile);
      fos.write(imageData);
      fos.close();
    } catch (Exception e) {
      System.err.printf("Failed to copy screenshot to %s/%s\n", htmlReportData.getReportDir(), fullFileName);
      e.printStackTrace();
    }

    htmlReportData.addScreenshotData(fullFileName, caption);
  }

  /**
   * Prints the address of each network interface on the machine.
   * Taken from http://stackoverflow.com/questions/9481865/getting-the-ip-address-of-the-current-machine-using-java
   */
  public static void printIPAddresses() {
    try {
      Enumeration<NetworkInterface> e = NetworkInterface.getNetworkInterfaces();
      while(e.hasMoreElements())
      {
          NetworkInterface n = e.nextElement();
          Enumeration<InetAddress> ee = n.getInetAddresses();
          while (ee.hasMoreElements())
          {
              InetAddress i = ee.nextElement();
              System.out.println(i.getHostAddress());
          }
      }
    } catch(SocketException e) {
      System.err.println("Could not print IP addresses");
      e.printStackTrace();
    }
  }
}
