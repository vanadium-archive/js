var http = require('http');
var https = require('https');
var parseUrl = require('url').parse;

var Promise = require('./promise');
var vlog = require('./vlog');

module.exports = {
  /**
   * Request a url via http and return a promise to the response. (Node version)
   * @param {string} url the url to request
   * @return {promise} a promise to an object with fields 'headers',
   * 'statusCode', and 'body'.
   */
  Request: function(url) {
    var client;
    var protocol = parseUrl(url).protocol;
    if (protocol === 'http:') {
      client = http;
      vlog.logger.warn('Sending insecure request to: ' + url);
    } else if (protocol === 'https:') {
      client = https;
    } else {
      throw new Error('Unsupported protocol: ' + url);
    }

    return new Promise(function(resolve, reject) {
      var req = client.get(url, function(response) {
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

      req.on('error', function(e) {
        reject(e);
      });

      req.setTimeout(5000, function() {
        reject('Timeout while accessing ' + url);
      });
    });
  }
};
