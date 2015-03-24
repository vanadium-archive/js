var extend = require('xtend');

module.exports = extend(
  require('./vtrace'),
  require('../gen-vdl/v.io/v23/vtrace')
);