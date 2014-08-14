/**
 * @fileoverview Defines the globals that will load before each
 * test in NodeJS and runs initialization for each test such as exposing
 * chai
 *
 * These globals are available to all tests without a need to require them.
 */

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

/**
 * expose Veyron as global
 */
global.veyron = require('../src/veyron');

/**
 * expose Expect as global
 */
global.expect = chai.expect;

/**
 * expose Assert as global
 */
global.assert = chai.assert;
