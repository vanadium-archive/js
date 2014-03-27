/**
 * @fileoverview Makes dynamic test configuration variables from Gruntfile
 * available to the tests.
 */

// Key, Value pairs for test configs
// This file is generated dynamically during the build. It contains
// the key, values in Gruntfile's "testConfigs" map.
var configValues = require('../dist/test/veyron.test.config.js');

var config = {
  get: function(name) {

    if (configValues[name] !== undefined) {
      return configValues(name);
    }

    throw new Error('No value found for test config: ' + name);
  }
};

/**
 * Export the module
 */
module.exports = config;
