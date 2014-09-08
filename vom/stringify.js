/**
 * @fileoverview Defines a stable stringifier that handles cycles.
 */

module.exports = stableCircularStringify;

function stableCircularStringifyInternal(val, seen) {
  if (typeof val === 'number' || typeof val === 'boolean' ||
     val === undefined || val === null) {
    return '' + val;
  }
  if (typeof val === 'string') {
    return '"' + val.replace(/\"/, '\\"') + '"';
  }

  for (var i = 0; i < seen.length; i++) {
    if (val === seen[i]) {
      return 'ID[' + i + ']';
    }
  }
  seen.push(val);

  var keys = Object.keys(val);
  keys.sort();

  var str = '{';
  for (var i = 0; i < keys.length; i++) {
    if (i > 0) {
      str += ',';
    }
    str += stableCircularStringifyInternal(keys[i], seen);
    str += ':';
    str += stableCircularStringifyInternal(val[keys[i]], seen);
  }
  str += '}';
  return str;
}

/**
 * Converts an object to a string in a stable manner, outputting ids for cycles.
 * This is necessary because JSON stringify won't handle circular types
 * properly and is not guaranteed to be stable for maps.
 * TODO(bprosnitz) Make this faster.
 * @param {Type} type the type object.
 * @return {string} The key.
 */
function stableCircularStringify(val) {
  return stableCircularStringifyInternal(val, []);
}