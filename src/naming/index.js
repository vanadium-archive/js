var extend = require('xtend');

module.exports = extend(
  require('../gen-vdl/v.io/v23/naming'), {
  util: require('./util')
});