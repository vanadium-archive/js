/**
 * @fileoverview Defines a stable stringifier that handles cycles.
 */

module.exports = stableCircularStringify;

require('./es6-shim');

function stableCircularStringifyInternal(val, seen) {
  if (typeof val === 'number' || typeof val === 'boolean' ||
     val === undefined || val === null) {
    return '' + val;
  }
  if (typeof val === 'string') {
    return '"' + val.replace(/\"/, '\\"') + '"';
  }

  var i;
  for (i = 0; i < seen.length; i++) {
    if (val === seen[i].input) {
      if (seen[i].hasOwnProperty('output')) {
        // If the value has been outputted already, return the cached output
        // rather than an id.
        // (without this, repeated objects generate ids)
        return seen[i].output;
      }
      return 'ID[' + i + ']';
    }
  }
  var seenObj = {input: val};
  seen.push(seenObj);

  if (Array.isArray(val)) {
    var arrStr = '[';
    for (var ai = 0; ai < val.length; ai++) {
      if (ai > 0) {
        arrStr += ',';
      }
      arrStr += stableCircularStringifyInternal(val[ai], seen);
    }
    arrStr += ']';
    // Attach the str to the object in seen to short-circuit lookup.
    seenObj.output = arrStr;
    return arrStr;
  }

  // Extract val's keys and values in a consistent order.
  var keys = [];
  var values = [];
  if (val.forEach !== undefined) {
    // The forEach prototype can be used to stringify Set and Map since
    // they have a fixed iteration order.
    val.forEach(function(value, key) {
      keys.push(key);
      if (val instanceof Set) {
        values.push(true); // {X:true} is our desired format for set.
      } else {
        values.push(value);
      }
    });
  } else {
    // Extract and sort Object keys to ensure consistent key order.
    keys = Object.keys(val);
    keys.sort();
    keys.forEach(function(key) {
      values.push(val[key]);
    });
  }

  // Pretty print the object keys and values.
  var str = '{';
  for (i = 0; i < keys.length; i++) {
    if (i > 0) {
      str += ',';
    }
    str += stableCircularStringifyInternal(keys[i], seen);
    str += ':';
    str += stableCircularStringifyInternal(values[i], seen);
  }
  str += '}';
  // Attach the str to the object in seen to short-circuit lookup.
  seenObj.output = str;
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
