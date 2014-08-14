/**
 *  @fileoverview Client library for the Namespace.
 */

var nameUtil = require('./util.js');
var Deferred = require('../lib/deferred');
var Promise = require('../lib/promise');
var vError = require('../lib/verror');

/**
 * Namespace handles manipulating and querying from the mount table.
 * @param {object} client A veyron client.
 * @param {...string} roots root addresses to use as the root mount tables.
 * @constructor
 */
var Namespace = function(client, roots) {
  this._client = client;
  this._roots = roots;
};

/*
 * Error returned when resolution hits a non-mount table.
 */
Namespace.errNotAMountTable = function() {
  return new vError.VeyronError(
    'Resolution target is not a mount table', vError.Ids.Aborted);
};

/*
 * Error returned from the mount table server when reading a non-existant name.
 */
Namespace.errNoSuchName = function() {
  return new vError.VeyronError(
    'Name doesn\'t exist', vError.Ids.NotFound);
};

/*
 * Error returned from the mount table server when reading a non-existant name.
 */
Namespace.errNoSuchNameRoot = function() {
  return new vError.VeyronError(
    'Name doesn\'t exist: root of namespace', vError.NotFound);
};

/*
 * Maximum number of hops between servers we will make to resolve a name.
 */
Namespace._maxDepth = 32;

/*
 * Make a name relative to the roots of this namespace.
 * @param {string} name A name.
 * @return {Array} A list of rooted names.
 */
Namespace.prototype._rootNames = function(name) {
  if (nameUtil.isRooted(name) && name !== '/') {
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
    var name = servers[i].server;
    if (suffix !== '') {
      name = nameUtil.join(name, suffix);
    }
    out.push(name);
  }
  return out;
}

/*
 * Utility function to make an array of names terminal.
 * @param {Array} names List of names.
 * @return {Array} list of terminal names.
 */
function makeAllTerminal(names) {
  return names.map(nameUtil.convertToTerminalName);
}

/*
 * Utility function to check if every name in an array is terminal.
 * @param {Array} names List of names.
 * @return {boolean} true if every name in the input was terminal.
 */
function allAreTerminal(names) {
  return names.every(nameUtil.isTerminal);
}

/*
 * Utility method to try a single resolve step against a list of
 * mirrored MountTable servers.
 * @param {Array} names List of names representing mirrored MountTable servers.
 * @return {Promise} a promise that will be fulfilled with a list of further
 * resolved names.
 */
Namespace.prototype._resolveAgainstMountTable = function(names) {
  if (names.length === 0) {
    return Promise.reject(
      new vError.BadArgError('No servers to resolve query.'));
  }

  // TODO(mattr): Maybe make this take a service signature.
  // That would be more efficient, but we would need to do error handling
  // differently.
  var self = this;
  var name = nameUtil.convertToTerminalName(names[0]);
  return this._client.bindTo(name).then(function onBind(service) {
    if (service.resolveStep === undefined) {
      throw Namespace.errNotAMountTable();
    }
    return service.resolveStep().then(convertServersToStrings);
  }).catch(function onError(err) {
    if (vError.equals(err, Namespace.errNoSuchName()) ||
        vError.equals(err, Namespace.errNoSuchNameRoot()) ||
        names.length <= 1) {
      throw err;
    } else {
      return self._resolveAgainstMountTable(names.slice(1));
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
Namespace.prototype._resolveLoop = function(curr, last, depth, handleErrors) {
  var self = this;
  return self._resolveAgainstMountTable(curr).then(function onResolve(names) {
    if (allAreTerminal(names)) {
      return names;
    }
    depth++;
    if (depth > Namespace._maxDepth) {
      throw new vError.InternalError('Maxiumum resolution depth exceeded.');
    }
    return self._resolveLoop(names, curr, depth, handleErrors);
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
Namespace.prototype.resolveToMountTable = function(name, callback) {
  var names = this._rootNames(name);
  var deferred = new Deferred(callback);
  var handleErrors = function(err, curr, last) {
    if (vError.equals(err, Namespace.errNoSuchNameRoot()) ||
        vError.equals(err, Namespace.errNotAMountTable())) {
      return makeAllTerminal(last);
    }
    if (vError.equals(err, Namespace.errNoSuchName())) {
      return makeAllTerminal(curr);
    }
    throw err;
  };

  deferred.resolve(this._resolveLoop(names, names, 0, handleErrors));

  return deferred.promise;
};

/**
 * resolveMaximally resolves a veyron name as far as it can, whether the
 * target is a mount table or not.
 * @param {string} name The name to resolve.
 * @param {function} [callback] if given, this fuction will be called on
 * completion of the resolve.  The first argument will be an error if there
 * is one, and the second argument is a list of terminal names.
 * @return {Promise} A promise to a list of terminal names.
 */
Namespace.prototype.resolveMaximally = function(name, callback) {
  var names = this._rootNames(name);
  var deferred = new Deferred(callback);
  var handleErrors = function(err, curr, last){
    if (vError.equals(err, Namespace.errNoSuchNameRoot()) ||
        vError.equals(err, Namespace.errNoSuchName()) ||
        vError.equals(err, Namespace.errNotAMountTable())) {
      return makeAllTerminal(curr);
    }
    throw err;
  };

  deferred.resolve(this._resolveLoop(names, names, 0, handleErrors));

  return deferred.promise;
};

module.exports = Namespace;
