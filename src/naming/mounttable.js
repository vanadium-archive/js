/**
 *  @fileoverview Client library for the MountTable.
 */

'use strict';

var nameUtil = require('./names.js');
var Deferred = require('../lib/deferred');
var Promise = require('../lib/promise');
var vError = require('../lib/verror');

/**
 * MountTable handles manipulating and querying from
 * a mounttable.
 * @param {object} client A veyron client.
 * @param {...string} roots root addresses to use as the root mounttables.
 * @constructor
 */
var MountTable = function(client, roots) {
  this._client = client;
  this._roots = roots;
};

/*
 * Error returned when resolution hits a non-MountTable.
 */
MountTable.errNotAMountTable = function() {
  return new vError.VeyronError(
    'Resolution target is not a MountTable', vError.Ids.Aborted);
};

/*
 * Error returned from the MountTable server when reading a non-existant name.
 */
MountTable.errNoSuchName = function() {
  return new vError.VeyronError(
    'Name doesn\'t exist', vError.Ids.NotFound);
};

/*
 * Error returned from the MountTable server when reading a non-existant name.
 */
MountTable.errNoSuchNameRoot = function() {
  return new vError.VeyronError(
    'Name doesn\'t exist: root of namespace', vError.NotFound);
};

/*
 * Maximum number of hops between servers we will make to resolve a name.
 */
MountTable._maxDepth = 32;

/*
 * Make a name relative to the roots of this MountTable.
 * @param {string} name A name.
 * @return {Array} A list of rooted names.
 */
MountTable.prototype._rootNames = function(name) {
  var parts = nameUtil.splitAddressName(name);
  if (parts.address !== '') {
    return [name];
  }
  var out = [];
  for (var i = 0; i < this._roots.length; i++) {
    out.push(nameUtil.join(this._roots[i], name));
  }
  return out;
};

/*
 * Utility function to join a suffix to a list of servers.
 * @param {Array} results An array of return values from a
 * resolveStep call.  The first element of the array is a list of servers.
 * The second element should be a string suffix.
 * @return {Array} list of servers with suffix appended.
 */
function convertServersToStrings(results) {
  var servers = results[0];
  var suffix = results[1];
  var out = [];
  for (var i = 0; i < servers.length; i++) {
    out.push(nameUtil.join(servers[i].server, suffix));
  }
  return out;
}

/*
 * Utility function to make an array of names terminal.
 * @param {Array} names List of names.
 * @return {Array} list of terminal names.
 */
function makeAllTerminal(names) {
  return names.map(nameUtil.makeTerminal);
}

/*
 * Utility function to check if every name in an array is terminal.
 * @param {Array} names List of names.
 * @return {boolean} true if every name in the input was terminal.
 */
function allAreTerminal(names) {
  return names.every(nameUtil.terminal);
}

/*
 * Utility method to try a single resolve step against a list of
 * mirrored MountTable servers.
 * @param {Array} names List of names representing mirrored MountTable servers.
 * @return {Promise} a promise that will be fulfilled with a list of further
 * resolved names.
 */
MountTable.prototype._resolveAgainstMountTable = function(names) {
  if (names.length === 0) {
    return Promise.reject(
      new vError.BadArgError('No servers to resolve query.'));
  }

  // TODO(mattr): Maybe make this take a service signature.
  // That would be more efficient, but we would need to do error handling
  // differently.
  var mt = this;
  var name = nameUtil.makeTerminal(names[0]);
  return this._client.bind(name).then(function onBind(service) {
    if (service.resolveStep === undefined) {
      throw MountTable.errNotAMountTable();
    }
    return service.resolveStep().then(convertServersToStrings);
  }).catch(function onError(err) {
    if (vError.equals(err, MountTable.errNoSuchName()) ||
        vError.equals(err, MountTable.errNoSuchNameRoot()) ||
        names.length <= 1) {
      throw err;
    } else {
      return mt._resolveAgainstMountTable(names.slice(1));
    }
  });
};

/*
 * Utility method to try a sequence of resolves until the resulting names are
 * entirely terminal.
 * @param {Array} curr List of equivalent names to try on this step.
 * @param {Array} last List of names that were tried on the previous step.
 * @param {number} depth The current depth of the recursive traversal.
 * @param {function} handleErrors A function that errors will be passed to
 * for special handling depending on the caller.
 * @return {Promise} a promise that will be fulfilled with a list of terminal
 * names.
 */
MountTable.prototype._resolveLoop = function(curr, last, depth, handleErrors) {
  var mt = this;
  return mt._resolveAgainstMountTable(curr).then(function onResolve(newNames) {
    if (allAreTerminal(newNames)) {
      return newNames;
    }
    depth++;
    if (depth > MountTable._maxDepth) {
      throw new vError.InternalError('Maxiumum resolution depth exceeded.');
    }
    return mt._resolveLoop(newNames, curr, depth, handleErrors);
  }, function onError(err) {
    return handleErrors(err, curr, last);
  });
};

/**
 * resolveToMountTable resolves a veyron name to the terminal name of the
 * innermost mountable that owns the name.
 * @param {string} name The name to resolve.
 * @param {function} [callback] if given, this fuction will be called on
 * completion of the resolve.  The first argument will be an error if there
 * is one, and the second argument is a list of terminal names.
 * @return {Promise} A promise to a list of terminal names.
 */
MountTable.prototype.resolveToMountTable = function(name, callback) {
  var names = this._rootNames(name);
  var deferred = new Deferred(callback);
  var handleErrors = function(err, curr, last) {
    if (vError.equals(err, MountTable.errNoSuchNameRoot()) ||
        vError.equals(err, MountTable.errNotAMountTable())) {
      return makeAllTerminal(last);
    }
    if (vError.equals(err, MountTable.errNoSuchName())) {
      return makeAllTerminal(curr);
    }
    throw err;
  };

  deferred.resolve(this._resolveLoop(names, names, 0, handleErrors));
  
  return deferred.promise;
};

/**
 * resolveMaximally resolves a veyron name as far as it can, whether the
 * target is a mounttable or not.
 * @param {string} name The name to resolve.
 * @param {function} [callback] if given, this fuction will be called on
 * completion of the resolve.  The first argument will be an error if there
 * is one, and the second argument is a list of terminal names.
 * @return {Promise} A promise to a list of terminal names.
 */
MountTable.prototype.resolveMaximally = function(name, callback) {
  var names = this._rootNames(name);
  var deferred = new Deferred(callback);
  var handleErrors = function(err, curr, last){
    if (vError.equals(err, MountTable.errNoSuchNameRoot()) ||
        vError.equals(err, MountTable.errNoSuchName()) ||
        vError.equals(err, MountTable.errNotAMountTable())) {
      return makeAllTerminal(curr);
    }
    throw err;
  };
  
  deferred.resolve(this._resolveLoop(names, names, 0, handleErrors));
  
  return deferred.promise;
};

module.exports = MountTable;
