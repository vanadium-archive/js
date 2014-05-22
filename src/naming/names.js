/**
 *  @fileoverview Utilities for working with veyron names.
 */

'use strict';

var names = {};

// TODO(cnicolaou): consider renaming {split,join}AddressName as
// {split,join}EndpointName. For join, it's not clear that host:port is
// really an Endpoint. Something to consider.

// Trim all slashes from the beginning of input.
function trimLeftSlashes(input) {
  while (input.length > 0 && input[0] === '/') {
    input = input.slice(1);
  }
  return input;
}

// Trim all slashes from the end of input.
function trimRightSlashes(input) {
  while (input.length > 0 && input.slice(-1) === '/') {
    input = input.slice(0, -1);
  }
  return input;
}

// Squash the first run of one or more / in s to a single /
function squashSlashRun(input) {
  var out = '';
  var seen = false;
  for (var i = 0; i < input.length; i++) {
    var c = input.charAt(i);
    if (c !== '/') {
      if (seen) {
        out += input.slice(i);
        return out;
      }
      out += c;
    } else {
      if (!seen) {
        out += '/';
      }
      seen = true;
    }
  }
  return out;
}

/**
 * splitAddressName takes a veyron name and returns the server address and
 * the name relative to the server. Terminal names (i.e. those starting
 * with '//'s) are maintained.
 * @param {string} a rooted name or a relative name; an empty string
 * address is returned for the latter case.
 * @return {object} object containing two fields address and name.  Address may
 * be in endpoint format or host:port format.   
 */
names.splitAddressName = function(name) {
  if (!names.rooted(name)) {
    return {address: '', name: name};
  }
  var elems = name.slice(1).split('/');
  if (elems.length === 1) {
    return {address: elems[0], name: ''};
  }
  if (elems.length > 2 && elems[1] === '') {
    return {address: elems[0], name: '/' + elems.slice(1).join('/')};
  }
  return {address: elems[0], name: elems.slice(1).join('/')};
};

/**
 * joinAddressName takes an address and a relative name and returns a rooted
 * or relative name. If a valid address is supplied then the returned name
 * will always be a rooted name (i.e. starting with /), otherwise it may
 * be relative. Address should not start with a / or // and if it does,
 * that prefix will be stripped.
 * @param {string} address An address (endpoint or host:port).
 * @param {string} name A relative name.
 * @return {string} A combined name.
 */
names.joinAddressName = function(address, name) {
  address = trimLeftSlashes(address);
  if (address.length === 0) {
    return name;
  }
  if (name.length === 0) {
    return '/' + address;
  }
  if (name[0] !== '/') {
    return '/' + address + '/' + name;
  }
  return '/' + address + name;
};

/**
 * terminal returns true if its argument is considered to be a terminal name.
 * Terminal names have three forms:
 * 1. A rooted name with a relative component starting with //.
 * 2. A rooted name with an empty relative component.
 * 3. A relative name starting with //.
 * A name containing // in other location is not considered terminal.
 * @param {string} name A name.
 * @return {boolean} True if the name is terminal.
 */
names.terminal = function(name) {
  var result = names.splitAddressName(name);
  name = result.name;
  return name.length === 0 || name.slice(0, 2) === '//';
};

/**
 * makeTerminal returns a version of name that's guaranteed to return true
 * when passed as an argument to the Terminal function above.
 * @param {string} name A name.
 * @return {string} a terminal version of the input.
 */
names.makeTerminal = function(name) {
  return names.makeTerminalAtIndex(name, 0);
};

// TODO(cnicolaou): if makeTerminalAtIndex doesn't end up being used then make
// it private.

/**
 * makeTerminalAtIndex returns a version of its argument that ensures that
 * the portion of the name, starting at the / specified by index, would
 * be considered terminal if it were the only portion of the relative name.
 *
 * For rooted names, the index starts at the relative name component
 * following the address. For relative names the index is from the start
 * of the relative name. Thus an index of 0 can be used to ensure that a
 * name is terminal as per the Terminal function above.
 *
 * A negative index starts counting from the end of the name. If an index
 * runs off of the end of the name (in either direction) it is treated
 * as referring to the end of that name.
 *
 * Consider the relative name a/b/c:
 * makeTerminalIndexAt('a/b/c;, 1) -> 'a//b/c'
 * makeTerminalIndexAt('a/b/c', -1) -> 'a/b//c'
 *
 * Trailing /'s are counted as if they were separating /, so that:
 * makeTerminalIndexAt('a/b/c/',3) -> 'a/b/c//'
 *
 * Runs of two or more / are truncated to // for the matching index,
 * but are otherwise unaffected:
 * makeTerminalIndexAt('a////b/c///',3) -> 'a////b/c//'
 * makeTerminalIndexAt('a/b///c',1) -> 'a//b///c'
 *
 * @param {string} name A name.
 * @return {string} a terminal version of the input.
 */
names.makeTerminalAtIndex = function(name, index) {
  if (name === '') {
    return '';
  }
  var parts = names.splitAddressName(name);
  var rel = parts.name;

  if (rel === '') {
    return names.joinAddressName(parts.address, rel);
  }
  
	// Split rel on runs of one or more /, count the number of slashes
	// in the string, assuming that the prefix to the string is counted
	// as a slash (i.e. index 0 means prepend).
  var rawFields = rel.split('/');
  var fields = [];
  for (var i = 0; i < rawFields.length; i++) {
    if (rawFields[i] !== '') {
      fields.push(rawFields[i]);
    }
  }
  var nSlashes = fields.length;
  if (nSlashes > 0 && rel.slice(-1) === '/') {
    nSlashes += 1;
  }
  
  var pos = index;
  if (index < 0) {
    pos = nSlashes + index;
  } else if (index >= nSlashes) {
    rel = trimRightSlashes(rel) + '//';
    return names.joinAddressName(parts.address, rel);
  }
  if (pos <= 0) {
    rel = '//' + trimLeftSlashes(rel);
    return names.joinAddressName(parts.address, rel);
  }

  var inARun = false;
  var inTheRun = false;
  var runIndex = 1;
  var result = '';
  if (rel.slice(0, 2) === '//') {
    runIndex = 0;
  }
  for (var j = 0; j < rel.length; j++) {
    var c = rel.charAt(j);
    if (c === '/') {
      if (!inARun) {
        inARun = true;
        if (runIndex === pos) {
          inTheRun = true;
          result += '//';
        }
        runIndex += 1;
      }
    } else {
      inARun = false;
      inTheRun = false;
    }
    if (!inTheRun) {
      result += c;
    }
  }
  return names.joinAddressName(parts.address, result);
};

/*
 * rooted returns true for any name that is considered to be rooted.
 * A rooted name is one that starts with a single / followed by
 * a non /. / on its own is considered rooted.
 * @param {string} name A name.
 * @return {boolean} True if the name is rooted.
 */
names.rooted = function(name) {
  if (name === '/') {
    return true;
  }
  if (name.slice(0, 1) !== '/') {
    return false;
  }
  if (name.slice(0, 2) === '//') {
    return false;
  }
  return true;
};

/*
 * makeResolvable returns a version of its argument that is resolvable,
 * that is, will cause Terminal to return false, with the following
 * exceptions:
 * - the name passed in is '', '/' since it returns the same value back
 * - the name passed in is '//', which is returned as '' which is terminal.
 *
 * Rooted names have the first run of one or more / after the address
 * reduced to a single /
 * Unrooted, relative names have either all leading / removed if present,
 * or, if not present, the first run of one or more / reduced to a single /
 * @param {string} name A name.
 * @return {string} A resolvable name.
 */
names.makeResolvable = function(name) {
  if (name === '' || name === '/') {
    return name;
  }
  if (names.rooted(name)) {
    var parts = names.splitAddressName(name);
    var squashed = squashSlashRun(parts.name);
    return names.joinAddressName(parts.address, squashed);
  }

  var trimmed = trimLeftSlashes(name);
  if (trimmed.length < name.length) {
		// We removed all leading / for a non-rooted name, so it must
		// now be resolvable.
    return trimmed;
  }
  return squashSlashRun(name);
};

/**
 * join takes a veyron name and appends the given suffix to it.
 * Any trailing /'s in name are removed and Join will not create a terminal
 * name from a resolvable name and suffix.
 * @param {string} name A name prefix.
 * @param {string} suffix A name suffix.
 * @return {string} A combined name.
 */
names.join = function(name, suffix) {
  name = trimRightSlashes(name);
  if (suffix.length === 0) {
    return name;
  }
  if (name.length === 0) {
    return suffix;
  }
  if (suffix[0] === '/') {
    return name + suffix;
  }
  return name + '/' + suffix;
};

module.exports = names;
