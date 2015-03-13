/*
 * @fileoverview Helpers for manipulating vanadium names.
 * See vanadium/release/go/src/v.io/v23/naming/parse.go for the
 * corresponding operations in golang.
 * @private
 */

module.exports = {
  clean: clean,
  join: join,
  isRooted: isRooted,
  basename: basename,
  stripBasename: stripBasename,
  splitAddressName: splitAddressName
};


/*
 * Normalizes a name by collapsing multiple slashes and removing any
 * trailing slashes.
 */
function clean(name) {
  return _removeTailSlash(_squashMultipleSlashes(name));
}

/*
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
function join(parts) {
  if (Array.isArray(parts)) {
    while (parts.length > 0 && parts[0] === '') {
      parts.splice(0, 1); // Remove empty strings; they add nothing to the join.
    }
    var joined = parts.join('/');
    return clean(joined);
  }
  return join(Array.prototype.slice.call(arguments));
}

/*
 * Determines if a name is rooted, that is beginning with a single '/'.
 * @param {string} The vanadium name.
 * @return {boolean} True if the name is rooted, false otherwise.
 */
function isRooted(name) {
  return name[0] === '/';
}

/*
 * SplitAddressName takes an object name and returns the server address and
 * the name relative to the server.
 * The name parameter may be a rooted name or a relative name; an empty string
 * address is returned for the latter case.
 * The returned address may be in endpoint format or host:port format.
 * Returned object will be in the format of:
 *      {address: <string>, suffix: <string>}
 * @param {string} The vanadium name.
 * @return {object} {address: <string>, suffix: <string>}
 */
function splitAddressName(name) {
  name = clean(name);

  if (!isRooted(name)) {
    return {
      address: '',
      suffix: name
    };
  }
  name = name.substr(1); // trim the beginning "/"
  if (name.length === 0) {
    return {
      address: '',
      suffix: ''
    };
  }

  if (name[0] === '@') { // <endpoint>/<suffix>
    var split = _splitIntoTwo(name, '@@/');
    if (split.suffix.length > 0) { // The trailing "@@" was stripped, restore
      split.address = split.address + '@@';
    }
    return split;
  }
  if (name[0] === '(') { // (blessing)@host:[port]/suffix
    var tmp = _splitIntoTwo(name, ')@').suffix;
    var suffix = _splitIntoTwo(tmp, '/').suffix;
    return {
      address: _trimEnd(name, '/' + suffix),
      suffix: suffix
    };
  }
  // host:[port]/suffix
  return _splitIntoTwo(name, '/');

  function _splitIntoTwo(str, separator) {
    var elems = str.split(separator);
    return {
      address: elems[0],
      suffix: elems.splice(1).join(separator)
    };
  }
}

/*
 * Gets the basename of the given vanadium name.
 * @param {string} The vanadium name.
 * @return {string} The basename of the given name
 */
function basename(name) {
  name = clean(name);
  var split = splitAddressName(name);
  if (split.suffix !== '') {
    return split.suffix.substring(split.suffix.lastIndexOf('/') + 1);
  } else {
    return split.address;
  }
}

/*
 * Retrieves the parent of the given name.
 * @param {string} The vanadium name.
 * @return {string | null} The parent's name or null, if there isn't one.
 */
function stripBasename(name) {
  name = clean(name);
  var split = splitAddressName(name);
  if (split.suffix !== '') {
    return name.substring(0, name.lastIndexOf('/'));
  } else {
    return '';
  }
}

// Replace every group of slashes in the string with a single slash.
function _squashMultipleSlashes(s) {
  return s.replace(/\/{2,}/g, '/');
}

// Remove the last slash in the string, if any.
function _removeTailSlash(s) {
  return s.replace(/\/$/g, '');
}

// Helper util that removes the given suf from the end of str
function _trimEnd(str, suf) {
  var index = str.lastIndexOf(suf);
  if (index + suf.length === str.length) {
    return str.substring(0, index);
  } else {
    return str;
  }
}