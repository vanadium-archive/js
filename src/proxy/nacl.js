/**
 * @fileoverview Forwards messages to and from a nacl module.
 * @private
 */

var extensionEventProxy = require('./event-proxy');
var extnUtils = require('../lib/extension-utils');
var Deferred = require('./../lib/deferred');
var Proxy = require('./index');
var random = require('../lib/random');
var vLog = require('./../lib/vlog');
var vdl = require('../vdl');
var vom = require('../vom');

module.exports = ProxyConnection;

/**
 * A client for the vanadium service using postMessage. Connects to the vanadium
 * browspr and performs RPCs.
 * @constructor
 * @private
 */
function ProxyConnection() {
  var self = this;

  this.instanceId = random.hex();

  this.onBrowsprMsg = function(msg) {
    var body;
    try {
      body = vom.decode(vdl.Util.hex2Bytes(msg.body));
    } catch (e) {
      vLog.warn('Failed to parse ' + msg.body);
      return;
    }

    if (msg.instanceId === self.instanceId) {
      self.process(body);
    }
  };

  extensionEventProxy.on('browsprMsg', this.onBrowsprMsg);

  // rethrow crash error when proxy fails.
  this.onCrash = function(msg) {
    self.emit('crash', new extnUtils.ExtensionCrashError(msg));
  };

  extensionEventProxy.on('crash', this.onCrash);

  var def = new Deferred();
  Proxy.call(this, def.promise);
  def.resolve(this);
}

ProxyConnection.prototype = Object.create(Proxy.prototype);

ProxyConnection.prototype.constructor = ProxyConnection;

ProxyConnection.prototype.send = function(msg) {
  var wrappedMsg = {
    instanceId: this.instanceId,
    msg: msg
  };
  extensionEventProxy.send('browsprMsg', wrappedMsg);
};

ProxyConnection.prototype.close = function(cb) {
  var defaultTimeout = 20000; // TODO(bprosnitz) Revisit decreasing this.
  var deferred = new Deferred(cb);

  extensionEventProxy.removeListener('crash', this.onCrash);

  extensionEventProxy.send('browsprCleanup', {
    instanceId: this.instanceId
  });

  var timedout = false;
  var timeout = setTimeout(function reject() {
    timedout = true;
    var err = new Error('Timeout: Failed to close the runtime in ' +
      defaultTimeout + ' ms');

    deferred.reject(err);
  }, defaultTimeout);

  var self = this;
  extensionEventProxy.once('browsprCleanupFinished', function() {
    extensionEventProxy.removeListener('browsprMsg', self.onBrowsprMsg);
    clearTimeout(timeout);
    if(!timedout) {
      deferred.resolve();
    }
  });

  return deferred.promise;
};

ProxyConnection.prototype.createInstance = function(settings, cb) {
  var msg = {
    instanceId: this.instanceId,
    settings: settings
  };
  extensionEventProxy.sendRpc('createInstance', msg, cb);
};
