/**
 * @fileoverview a set of wrapped primitives
 * @private
 */

module.exports = {};

var Types = require('./types');
var Registry = require('./registry');

for (var typeName in Types) {
  if (Types.hasOwnProperty(typeName)) {
    var type = Types[typeName];
    if (typeof type === 'object') { // Do not export functions.
      module.exports[typeName] = Registry.lookupOrCreateConstructor(type);
    }
  }
}
