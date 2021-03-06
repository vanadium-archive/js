// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @summary Namespace extenstion defines Chrome extension related exports.
 * @description Namespace extenstion defines Chrome extension related exports.
 * This is only available in browser environment and will not exist in NodeJS.
 * @namespace
 * @name extension
 * @memberof module:vanadium
 */

var domready = require('domready');
var extend = require('xtend');

var Deferred = require('../lib/deferred');
var consts = require('./extension-consts');

module.exports = {
  isExtensionInstalled: isExtensionInstalled,
  promptUserToInstallExtension: promptUserToInstallExtension
};

/**
 * Checks if the Vanadium extension is installed or not.
 * @param cb (error, boolean) Optional callback
 * @return {Promise.<boolean>} Promise that will be resolved with a boolean or
 * rejected with an error if there is one.
 * @memberof module:vanadium.extension
 */
function isExtensionInstalled(cb) {
  var def = new Deferred(cb);

  var imgUrl = 'chrome-extension://' + consts.extensionId + '/images/1x1.png';

  var img = window.document.createElement('img');
  img.setAttribute('src', imgUrl);

  img.addEventListener('load', loadHandler);
  img.addEventListener('error', errorHandler);

  function errorHandler() {
    def.resolve(false);
    removeHandlers();
  }

  function loadHandler() {
    def.resolve(true);
    removeHandlers();
  }

  function removeHandlers() {
    img.removeEventListener('load', loadHandler);
    img.removeEventListener('error', errorHandler);
  }

  return def.promise;
}

/**
 * Prompts the user to install the extension and reloads the page when extension
 * is installed. Some styling attributes such as colors and font can be
 * specified via options.
 * @param {object} options Styling options for prompt.
 * @param {string} [options.linkColor=#00838F] Link color.
 * @param {string} [options.buttonColor=#00838F] Button color.
 * @param {string} [options.titleColor=#00838F] Title color.
 * @param {string} [options.fontSize=18px] Font size.
 * @param {string} [options.fontFamily='Roboto', sans-serif] Font family.
 * @param {string} [options.titleFontSize=24px] Font size for title text.
 * @memberof module:vanadium.extension
 */
function promptUserToInstallExtension(options) {
  var defaults = {
    linkColor: '#00838F',
    buttonColor: '#00838F',
    titleColor: '#00838F',
    fontSize: '18px',
    fontFamily: '\'Roboto\', sans-serif',
    titleFontSize: '24px'
  };
  options = extend(defaults, options);

  var POLLING_INTERVAL = 1 * 1000;
  domready(function() {
    renderPrompt();
    poll();

    // poll until extension gets installed
    function poll() {
      isExtensionInstalled().then(function(isInstalled) {
        if (isInstalled) {
          window.location.reload();
        } else {
          setTimeout(poll, POLLING_INTERVAL);
        }
      });
    }
  });

  function renderPrompt() {
    // Note: We are in some other apps DOM, we need to be careful. We should not
    // specify ids, class names or styles so we do not stump on anything.
    // This is why all styles are inlined with the elements.

    var container = renderContainer();
    var dialog = renderDialog();

    container.appendChild(dialog);
    window.document.body.appendChild(container);
  }

  function renderContainer() {
    var MAX_ZINDEX = 2147483647;
    var container = window.document.createElement('div');
    var style = [
      'display: flex',
      'position: fixed',
      'z-index:' + (MAX_ZINDEX - 1),
      'top: 0',
      'left: 0',
      'right: 0',
      'bottom: 0',
      'padding: 10px',
      'background-color: rgba(0, 0, 0, 0.6)',
      'font-family: ' + options.fontFamily,
      'font-size: ' + options.fontSize,
      'color: rgba(0, 0, 0, 0.87)'
    ].join(' !important;');
    container.setAttribute('style', style);

    return container;
  }

  function renderDialog() {
    var title = renderTitle();
    var content = renderContent();

    var dialog = window.document.createElement('div');
    var style = [
      'display: inline-block',
      'box-sizing: border-box',
      'align-self: center',
      'word-break: break-word',
      'max-width: 800px',
      'min-width: 480px',
      'padding: 15px',
      'margin: auto',
      'background-color: #FFFFFF',
      'box-shadow: rgba(0,0,0,0.2) 5px 5px 10px 5px'
    ].join('!important;');
    dialog.setAttribute('style', style);
    dialog.setAttribute('role', 'dialog');
    dialog.appendChild(title);
    dialog.appendChild(content);
    return dialog;
  }

  function renderTitle() {
    var title = window.document.createElement('h1');
    var style = [
      'margin: 0 0 10px 0',
      'color : ' + options.titleColor,
      'font-size: ' + options.titleFontSize
    ].join('!important;');
    title.setAttribute('style', style);
    title.textContent = 'Chrome Vanadium Extension is required.';

    return title;
  }

  function renderContent() {
    var content = window.document.createElement('div');
    var text = window.document.createElement('div');
    text.textContent =
      'Support for web applications is a work-in-progress.\n' +
      'Vanadium web apps can only run in the Chrome desktop browser with the ' +
      'Vanadium Extension installed. ';

    var moreInfoLink = window.document.createElement('a');
    moreInfoLink.textContent = 'Learn more.';
    moreInfoLink.href = consts.extensionDocsUrl;
    moreInfoLink.target = '_blank';
    var linkStyle = [
      'color: ' + options.linkColor,
      'text-decoration: none'
    ].join(' !important;');
    moreInfoLink.setAttribute('style', linkStyle);
    text.appendChild(moreInfoLink);

    var button = window.document.createElement('a');
    button.textContent = 'Install Vanadium Extension';
    button.href = consts.extensionUrl;
    button.target = '_blank';
    var buttonStyle = [
      'display: inline-block',
      'float: right',
      'background-color: ' + options.buttonColor,
      'color: #FFFFFF',
      'text-decoration: none',
      'margin: 15px 0 0 0',
      'padding: 10px',
      'border-radius: 3px',
      'box-shadow: 1px 2px 7px 0 rgba(0,0,0,0.8)'
    ].join(' !important;');
    button.setAttribute('style', buttonStyle);
    content.appendChild(text);
    content.appendChild(button);
    return content;
  }
}
