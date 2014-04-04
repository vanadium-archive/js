'use strict';

var http = require('http');
var Promise = require('./promise');

module.exports = {
  /**
   * Request a url via http and return a promise to the response. (Node version)
   * @param {string} url the url to request
   * @return {promise} a promise to an object with fields 'headers',
   * 'statusCode', and 'body'.
   */
  Request: function(url) {
    return new Promise(function(resolve, reject) {
      var client = http.get(url, function(response) {
        var result = {
          statusCode: response.statusCode,
          headers: response.headers,
        };
        response.setEncoding('UTF-8');
        result.body = '';
        response.on('data', function(chunk) {
          result.body += chunk;
        });
        response.on('end', function() {
          resolve(result);
        });
      });

      client.on('error', function(e) {
        reject(e);
      });

      client.setTimeout(5000, function() {
        reject('Timeout while accessing ' + url);
      });
    });
  }
};
