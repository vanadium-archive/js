// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver;

import java.awt.AWTException;
import java.awt.Robot;
import java.awt.Toolkit;
import java.awt.datatransfer.Clipboard;
import java.awt.datatransfer.StringSelection;
import java.awt.event.KeyEvent;

/**
 * A helper class for Robot related functions.
 * <p>
 * Most of the automation should be done through WebDriver APIs, but some elements (e.g. Chrome's
 * native Sign-in page or the confirmation dialog after an extension is installed) cannot be
 * accessed and controlled by WebDriver. In those cases, we use Robot to send key strokes, mouse
 * clicks, etc.
 *
 * @author jingjin@google.com
 */
public class RobotHelper {
  /**
   * This is a singleton instance.
   */
  private static RobotHelper instance;

  private final Robot robot;

  public static RobotHelper sharedInstance() throws AWTException {
    if (instance == null) {
      instance = new RobotHelper();
    }
    return instance;
  }

  private RobotHelper() throws AWTException {
    robot = new Robot();
    robot.setAutoDelay(200);
    robot.setAutoWaitForIdle(true);
  }

  /**
   * Enters the given text to the focused element.
   *
   * <p>To make the process easier, we copy the given text to system clipboard and paste it into the
   * target element. Otherwise, we have to call "keyPress" and "keyRelease" on each key stroke.
   *
   * @param text the text to enter.
   */
  public void enterText(String text) {
    // Copy text to clipboard.
    Clipboard clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
    StringSelection stringSelection = new StringSelection(text);
    clipboard.setContents(stringSelection, stringSelection);

    // Send Ctrl+V to paste.
    robot.keyPress(KeyEvent.VK_CONTROL);
    robot.keyPress(KeyEvent.VK_V);
    robot.keyRelease(KeyEvent.VK_V);
    robot.keyRelease(KeyEvent.VK_CONTROL);
  }

  /**
   * Presses TAB.
   */
  public void tab() {
    robot.keyPress(KeyEvent.VK_TAB);
    robot.keyRelease(KeyEvent.VK_TAB);
  }

  /**
   * Presses Enter.
   */
  public void enter() {
    robot.keyPress(KeyEvent.VK_ENTER);
    robot.keyRelease(KeyEvent.VK_ENTER);
  }
}
