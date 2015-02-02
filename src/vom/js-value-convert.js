/**
 * @fileoverview Converts native JavaScript values to and from JSValue
 * The outputted JSValues are not necessarily canonical, nor in the same form.
 * For example, a Set turns into a list of its keys, and Map and Object become
 * a list of key-value pairs.
 * This file should not be exported at the top-level; it is meant to be used by
 * canonicalize only. It is unit-tested separately.
 */

var TypeUtil = require('./type-util.js');
var Types = require('./types.js');
var stringify = require('./stringify.js');
var util = require('./util.js');
require('./es6-shim');

module.exports = {
  fromNative: convertFromNative,
  toNative: convertToNative
};

// There is only a single JSValueConstructor.
// In order to avoid any cyclical dependencies, this constructor is obtained
// from the registry with delayed dependency injection.
// TODO(alexfandrianto): Can this be obtained from a VDL file that defines the
// JSValue? A potential issue is that VDL-generated files require 'vom', and
// this is the 'vom' library.
var JSValueConstructor = null;
function getJSValueConstructor() {
  if (JSValueConstructor === null) {
    var Registry = require('./registry.js');
    JSValueConstructor = Registry.lookupOrCreateConstructor(Types.JSVALUE);
  }
  return JSValueConstructor;
}
/**
 * Convert the given raw value into the proper JSValue form.
 * Note: Skips typed values, so it will not convert any native values there.
 * Excluding undefined, raw values satisfy the following equality:
 * convertToNative(convertFromNative(val)) === val
 * @param{any} val The value to be molded into a JSValue
 * @return The JSValue
 */
function convertFromNative(val) {
  // No need to convert if val is already a JSValue or typed object.
  // Note: In this case, val is NOT a new reference.
  if (TypeUtil.isTyped(val)) {
    return val;
  }

  // Associate the JSValue prototype with the returned object.
  // Avoids using 'new JSValue(...)' because that would call canonicalize.
  var JSValue = getJSValueConstructor();
  var ret = Object.create(JSValue.prototype);

  if (val === undefined || val === null) {
    ret.null = {}; // must be the 'empty struct', but any value will do.
  } else if (typeof val === 'boolean') {
    ret.boolean = val;
  } else if (typeof val === 'number') {
    ret.number = val;
  } else if (typeof val === 'string') {
    ret.string = val;
  } else if (typeof val !== 'object') {
    // From here on, only objects can convert to JSValue.
    throw new TypeError('Cannot convert a ' + (typeof val) + ' to JSValue');
  } else if (val instanceof Uint8Array) {
    ret.bytes = new Uint8Array(val);
  } else if (Array.isArray(val)) {
    ret.list = val.map(function(elem) {
      return convertFromNative(elem);
    });
  } else if (val instanceof Set) {
    // Set: Return a []JSValue
    var keys = [];
    val.forEach(function(key) {
      keys.push(convertFromNative(key));
    });
    ret.set = keys;
  } else if (val instanceof Map) {
    // Map: Return []{key, value pairs}
    var keyVals = [];
    val.forEach(function(elem, key) {
      keyVals.push({
        'key': convertFromNative(key),
        'value': convertFromNative(elem)
      });
    });
    ret.map = keyVals;
  } else {
    // defaults to... Object: Return []{string key, value pairs}
    // Note: Ignores 'private' fields: keys that start with '_'
    ret.object = Object.keys(val).filter(util.isExportedStructField).map(
      function(key) {
        return {
          'key': key,
          'value': convertFromNative(val[key])
        };
      }
    );
  }
  return ret;
}

/**
 * Convert the given JSValue into the proper raw value.
 * Note: Skips conversion of non-JS values.
 * Excluding undefined, raw values satisfy the following equality:
 * convertToNative(convertFromNative(val)) === val
 * @param{JSValue} jsval The JSValue to be restored into raw form.
 * @return The raw value
 */
function convertToNative(jsval) {
  // No need to convert if jsval lacks type or isn't of type JSValue.
  if (!TypeUtil.isTyped(jsval) ||
    stringify(jsval._type) !== stringify(Types.JSVALUE)) {

    return jsval;
  }
  if (jsval === undefined) {
    return null;
  }

  // jsval is in the OneOf format. Extract its value, ignoring keys associated
  // with undefined values.
  var jsvalKey = util.getFirstDefinedPropertyKey(jsval);
  if (jsvalKey === undefined) {
    throw new Error('could not convert from JSValue. given: ' +
      JSON.stringify(jsval));
  }
  var jsvalElem = jsval[jsvalKey];
  return convertToNativeInternal(jsvalKey, jsvalElem);
}

// Based on the key and internal JSValue, return the raw value.
function convertToNativeInternal(jsvalKey, jsvalElem) {
  switch(jsvalKey) {
    case 'null':
      return null;
    case 'boolean':
    case 'number':
    case 'string':
    case 'bytes':
      return jsvalElem;
    case 'list':
      var list = new Array(jsvalElem.length);
      for (var i = 0; i < jsvalElem.length; i++) {
        list[i] = convertToNative(jsvalElem[i]);
      }
      return list;
    case 'set':
      var set = new Set();
      jsvalElem.forEach(function(j) {
        set.add(convertToNative(j));
      });
      return set;
    case 'map':
      var map = new Map();
      jsvalElem.forEach(function(j) {
        map.set(
          convertToNative(j.key),
          convertToNative(j.value)
        );
      });
      return map;
    case 'object':
      var object = {};
      jsvalElem.forEach(function(j) {
        object[j.key] = convertToNative(j.value);
      });
      return object;
    default:
      throw new Error('unknown JSValue key ' + jsvalKey + ' with value ' +
        jsvalElem);
  }
}
