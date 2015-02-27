/**
 * @fileoverview Helpers for manipulating vanadium names.
 * See vanadium/release/go/src/v.io/v23/naming/parse.go for the
 * corresponding operations in golang.
 * @private
 */

// Replace every group of slashes in the string with a single slash.
var _squashMultipleSlashes = function(s) {
  return s.replace(/\/{2,}/g, '/');
};

// Remove the last slash in the string, if any.
var _removeTailSlash = function(s) {
  return s.replace(/\/$/g, '');
};

/**
  * Normalizes a name by collapsing multiple slashes and removing any
  * trailing slashes.
  */
var clean = function(name) {
  return _removeTailSlash(_squashMultipleSlashes(name));
};

/**
 * Joins parts of a name into a whole. The joined name will be cleaned; it only
 * preserved the rootedness of the name components.
 * Examples:
 * join(['a, b']) -> 'a/b'
 * join('/a/b/', '//d') -> '/a/b/d'
 * join('//a/b', 'c/') -> '/a/b/c'
 * @param {array | varargs} Either a single array that contains the strings
 * to join or a variable number of string arguments that will be joined.
 * @return {string} A joined string
 */
var join = function(parts) {
  if (Array.isArray(parts)) {
    while (parts.length > 0 && parts[0] === '') {
      parts.splice(0, 1); // Remove empty strings; they add nothing to the join.
    }
    var joined = parts.join('/');
    return clean(joined);
  }
  return join(Array.prototype.slice.call(arguments));
};

/**
  * Determines if a name is rooted, that is beginning with a single '/'.
  * @param {string} The vanadium name.
  * @return {boolean} True if the name is rooted, false otherwise.
  */
var isRooted = function(name) {
  return name[0] === '/';
};

/**
  * Retrieves the parent of the given name.
  * @param {string} The vanadium name.
  * @return {string | null} The parent's name or null, if there isn't one.
  */
var stripBasename = function(name) {
  var normal = clean(name);
  return normal.substring(0, normal.lastIndexOf('/'));
};

/**
  * Gets the basename of the given vanadium name.
  * @param {string} The vanadium name.
  * @return {string} The basename of the given name
  */
var basename = function(name) {
  var normal = clean(name);
  return normal.substring(normal.lastIndexOf('/') + 1);
};

module.exports = {
  clean: clean,
  join: join,
  isRooted: isRooted,
  stripBasename: stripBasename,
  basename: basename
};
