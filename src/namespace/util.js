/**
 * @fileoverview Helpers for manipulating veyron names.
 * @private
 */

var _numInitialSlashes = function(s) {
  for (var i = 0; i < s.length; i++) {
    if (s.charAt(i) !== '/') {
      return i;
    }
  }
  return s.length;
};
var _numTailSlashes = function(s) {
  for (var i = s.length - 1; i >= 0; i--) {
    if (s.charAt(i) !== '/') {
      return s.length - 1 - i;
    }
  }
  return s.length;
};


var _removeInitialSlashes = function(s) {
  return s.replace(/^\/*/g, '');
};
var _removeTailSlashes = function(s) {
  return s.replace(/\/*$/g, '');
};

var _joinNamePartsOnArray = function(parts) {
  if (parts.length === 0) {
    return '';
  }

  if (parts[0] === '') {
    parts = parts.slice(1);
  }

  var name = parts[0];
  for (var i = 1; i < parts.length; i++) {
    var addedPart = parts[i];

    var numNameSlashes = _numTailSlashes(name);
    var numAddedPartSlashes = _numInitialSlashes(addedPart);

    if (numNameSlashes === 0 && numAddedPartSlashes === 0) {
      name += '/' + addedPart;
      continue;
    }

    if (numAddedPartSlashes > numNameSlashes) {
      name = _removeTailSlashes(name);
      name += addedPart;
    } else {
      name += _removeInitialSlashes(addedPart);
    }
  }

  return name;
};

/**
 * Joins parts of a name into a whole.
 * It preserves the rootedness and terminality of the name components.
 * Examples:
 * join(['a, b']) -> 'a/b'
 * join('/a/b/', '//d') -> '/a/b//d'
 * join('//a/b', 'c/') -> '//a/b/c/'
 * @param {array | varargs} Either a single array that contains the strings
 * to join or a variable number of string arguments that will be joined.
 * @return {string} A joined string
 */
var join = function(parts) {
  if (Array.isArray(parts)) {
    return _joinNamePartsOnArray(parts);
  }
  return _joinNamePartsOnArray(Array.prototype.slice.call(arguments));
};

/**
  * Determines if a name is rooted, that is beginning with a single '/'.
  * @param {string} The veyron name.
  * @return {boolean} True if the name is rooted, false otherwise.
  */
var isRooted = function(name) {
  return _numInitialSlashes(name) === 1;
};

/**
  * Strips the basename off the rest of the given veyron name.
  * @param {string} The veyron name.
  * @return {string} The string prefixing the given name's basename.
  */
var stripBasename = function(name) {
  return name.substring(0, name.lastIndexOf('/') + 1);
};

/**
  * Gets the basename of the given veyron name.
  * @param {string} The veyron name.
  * @return {string} The basename of the given name
  */
var basename = function(name) {
  return name.substring(name.lastIndexOf('/') + 1);
};

module.exports = {
  join: join,
  isRooted: isRooted,
  stripBasename: stripBasename,
  basename: basename
};
