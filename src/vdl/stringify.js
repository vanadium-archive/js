// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Defines a stable stringifier that handles cycles.
 * @private
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
  if (seen.has(val)) {
    var ret = seen.get(val);
    if (ret.hasOwnProperty('output')) {
      return ret.output;
    } else {
      return 'ID[' + ret.id + ']';
    }
  }
  var seenObj = { id: seen.size };
  seen.set(val, seenObj);

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
    // We have to make sure to print maps and sets in sorted key order.
    // While Set and Map have an iteration order equivalent to their insertion
    // order, we still want non-matching insertion orders to have matching
    // stringify output.
    val.forEach(function(value, key) {
      keys.push(key);
    });
    keys.sort();
    keys.forEach(function(key) {
      if (val instanceof Set) {
        values.push(true); // {X:true} is our desired format for set.
      } else {
        values.push(val.get(key));
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
 * @private
 * @param {Type} type the type object.
 * @return {string} The key.
 */
function stableCircularStringify(val) {
  return stableCircularStringifyInternal(val, new Map());
}
