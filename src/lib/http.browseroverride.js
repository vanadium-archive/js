'use strict';

var Promise = require('./promise');

module.exports = {
  /**
    * Request a url via http and return a promise to the response.
    * @param {string} url the url to request
    * @return {promise} a promise to an object with fields 'headers',
    * 'statusCode', and 'body'.
    */
  Request: function(url) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function(e) {
        if (xhr.status === 200) {
          var result = {
            statusCode: xhr.status,
            headers: xhr.getAllResponseHeaders(),
            body: xhr.responseText,
          };
          resolve(result);
        } else {
          reject('Got statusCode: ' + xhr.status + '. Body: ' +
            xhr.responseText);
        }
      };
      xhr.timeout = 5000;
      xhr.ontimeout = function() {
        reject('Error when requesting ' + url + ': ' + xhr.statusText);
      };
      xhr.onerror = function(e) {
        reject(xhr.statusText);
      };
      xhr.open('GET', url, true);
      xhr.send();
    });
  }
};