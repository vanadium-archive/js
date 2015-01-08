/**
 * @fileoverview Defines an invoker to invoke service methods.
 * @private
 */

module.exports = Invoker;

var createSignatures = require('../vdl/create-signatures');
var isPublicMethod = require('../lib/service-reflection').isPublicMethod;
var verror = require('../lib/verror');
var vom = require('vom');
var format = require('util').format;
var ArgInspector = require('../lib/arg-inspector');

/**
  * Create an invoker.
  * @param {Service} service Service object.
  * @constructor
  * @private
  */
function Invoker(service) {
  if (!(this instanceof Invoker)) {
    return new Invoker(service);
  }

  var invoker = this;

  invoker._service = service;
  invoker._signature = createSignatures(service, service._serviceDescription);
  invoker._methods = {};

  // See comment in src/vdl/reflect-signature.js for..in loop
  for (var key in service) { // jshint ignore:line
    if (!isPublicMethod(key, service)) {
      continue;
    }

    var capitalizedMethodName = vom.MiscUtil.capitalize(key);
    var method = service[key];

    invoker._methods[capitalizedMethodName] = {
      name: capitalizedMethodName,
      fn: method,
      args: new ArgInspector(method)
    };
  }
}

/**
 * Invoker.prototype.invoke - Invoke a method
 *
 * @param  {String} name - The upper camel case name of the method to invoke.
 * @param  {Array} args - A list of arguments to call the method with, may
 * differ because of injections e.g. function x(a,$stream,b) => [0, 2].
 * @param  {Object} injections - A map of injections, should always
 * contain `context`, could also contain `stream`
 * e.g. function(ctx, x, $stream, b)
 * @param  {Invoker~invokeCallback} cb - The callback fired after completion.
 */
Invoker.prototype.invoke = function(name, args, injections, cb) {
  // TODO(jasoncampbell): Maybe throw if there are unkown injections

  var invoker = this;
  var service = invoker._service;
  var method = invoker._methods[name];
  var message;
  var err;

  if (!injections.context) {
    message = 'Can not call invoker.invoke(...) without a context injection';
    err = verror.InternalError(message);
    cb(err);
    return;
  }

  if (!method) {
    message = format('Method "%s" does not exist.', name);
    err = verror.NoExistError(message);
    cb(err);
    return;
  }

  var arity = method.args.arity();

  // Check argument arity against the method's declared arity
  if (args.length !== arity) {
    var template = 'Expected %d arguments but got "%s"';

    message = format(template, arity, args.join(', '));
    err = verror.BadArgError(message);
    cb(err);
    return;
  }

  // Clone the array so we can simply manipulate and apply later
  var clone = args.slice(0);

  // context goes in front
  clone.unshift(injections.context);

  // callback in the back
  clone.push(cb);

  // splice in stream
  if (injections.stream) {
    var start = method.args.position('$stream');
    var deleteCount = 0;

    clone.splice(start, deleteCount, injections.stream);
  }

  var results;

  try {
    results = method.fn.apply(service, clone);
  } catch (e) {
    // This might be a good place to throw if there was a developer error
    // service side...
    cb(wrapError(e));
    return;
  }

  // No need to carry on if the method didn't return anythig.
  //
  // NOTE: It's possible to get falsey return values (false, empty string) so
  // always check for results === undefined.
  if (results === undefined) {
    return;
  }

  // Use Promise.resolve to to handle thenable (promises) and null checking
  Promise
  .resolve(results)
  .then(function (res) {
    cb(null, res);
  })
  .catch(function error(err) {
    cb(wrapError(err));
  });
};

/**
 * This callback is fired on completion of invoker.invoke.
 * @callback Invoker~invokeCallback
 * @param {Error} err
 * @param {results} results
 */

/**
 * Return the signature of the service.
 * @return {Object} The signature
 */
Invoker.prototype.signature = function() {
  return this._signature;
};

/**
 * Wrap an error so that it is always of type Error.
 * This is used in cases where values are known to be errors even if they
 * are not of error type such as if they are thrown or rejected.
 * @private
 * @param {Error} err The error or other value.
 * @return {Error} An error or type Error.
 */
function wrapError(err) {
  if (!(err instanceof Error)) {
    return new Error(err);
  } else {
    return err;
  }
}
