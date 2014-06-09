/**
 *  @fileoverview Client for the Veyron store.
 *
 *  Usage:
 *  // With transactions:
 *  var tr = Veyron.transaction();
 *  var store = veyron.newStore();
 *  store.bindTo('/addr/of/object1').then(function(s) {
 *    return s.get(tr);
 *  }.then(function(obj1) {
 *    return store.bindTo('/addr/of/object2').then(function(s) {
 *      return s.put(tr, obj1.value);
 *    });
 *  }).then(function() {
 *    return tr.commit(); // (tr.abort is also an option)
 *  });
 *
 *  // Operations without setting up transactions manually:
 *  var stream = store.bindTo('/path/to/glob').glob('*');
 *  stream.on('data', function(item) {
 *    console.log('Glob result: ' + item);
 *  });
 *  stream.on('error', function(err) {
 *    console.err('Error occured in glob: ' + err);
 *  });
 */

'use strict';

var Promise = require('../lib/promise');

var _joinAddressParts = function() {
  // TODO(bprosnitz) This is not correct, we can create '//' where by
  // concatinating 'a/' and 'b'.
  var args = Array.prototype.slice.call(arguments);
  return args.join('/');
};

// Modifies stream in rpcPromise to emit 'error' events when the promise
// rejects.
// TODO(bprosnitz) This should probably happen to all veyron streams.
var _makeStreamWithErrors = function(rpcPromise) {
  // TODO(bprosnitz) Cancelling a stream should cancel the RPC (for watch).
  var stream = rpcPromise.stream;
  rpcPromise.catch(function(err) {
    stream.emit('error', err);
  });
  return stream;
};

// Generate a transaction id. This uses the same algorithm as go.
// TODO(bprosnitz) Should we use an algorithm that better covers the 64 bit
// space?
var _createTransactionID = function() {
  // 1 << 62 is greatest int 64 val.
  // This does not actually generate 62 bits of entropy because javascript uses
  // floating point numbers.
  return Math.floor(Math.random() * (1 << 62));
};

// Gets a transaction ID from a transaction, or return 0 (the signal to make
// a transaction for the duration of the method) if the transaction is falsy.
var _getTrId = function(tr) {
  if (tr) {
    return tr._id;
  }
  return 0;
};

/**
 * Transaction represents a transaction in the store.
 * It is only valid against one store.
 * @constructor
 */
var Transaction = function() {
  if (!(this instanceof Transaction)) {
    return new Transaction();
  }
  this._id = _createTransactionID();
  this._client = null;
  this._storageService = null;
};

Transaction.prototype._updateTransaction = function(client, service) {
  // TODO(bprosnitz) The check below fails in the tests. Figure out why and
  // fix this.
  /*if (this._client && client !== this._client) {
    throw new Error('Cannot change a transaction\'s client.');
  }*/
  this._client = client;
  this._storageService = _joinAddressParts(service, '.store');
  if (!this._transactionCreation) {
    var trid = this._id;
    this._transactionCreation = this._client.bindTo(
      this._storageService).then(function(srvc) {
      return srvc.createTransaction(trid, []);
    });
  }
  return this._transactionCreation;
};

Transaction.prototype.commit = function() {
  if (this._client === null) {
    // Empty transaction.
    return Promise.resolve();
  }
  var trid = this._id;
  return this._client.bindTo(this._storageService).then(function(srvc) {
    return srvc.commit(trid);
  });
};

Transaction.prototype.abort = function() {
  if (this._client === null) {
    // Empty transaction.
    return Promise.resolve();
  }
  var trid = this._id;
  return this._client.bindTo(this._storageService).then(function(srvc) {
    return srvc.abort(trid);
  });
};

/**
 * StoreObject represents an object in the store.
 * The methods on this object are defined in services/store/service.idl
 * @param {object} client The veyron client.
 * @param {string} The path of the store object.
 * @constructor
 */
var StoreObject = function(client, path) {
  this._client = client;
  this._path = path;
  this._bindPromise = this._client.bindTo(_joinAddressParts(this._path, '/'));
};

StoreObject.prototype._updateTransactionAndBind = function(tr) {
  if (!tr)  {
    return this._bindPromise;
  }
  var self = this;
  return tr._updateTransaction(this._client, this._path).then(function() {
    return self._bindPromise;
  });
};

// See store/service.vdl for method descriptions.
StoreObject.prototype.exists = function(tr) {
  return this._updateTransactionAndBind(tr).then(function(srvc) {
    return srvc.exists(_getTrId(tr));
  });
};
StoreObject.prototype.get = function(tr) {
  return this._updateTransactionAndBind(tr).then(function(srvc) {
    return srvc.get(_getTrId(tr));
  });
};
StoreObject.prototype.put = function(tr, v) {
  return this._updateTransactionAndBind(tr).then(function(srvc) {
    return srvc.put(_getTrId(tr), v);
  });
};
StoreObject.prototype.remove = function(tr) {
  return this._updateTransactionAndBind(tr).then(function(srvc) {
    return srvc.remove(_getTrId(tr));
  });
};
StoreObject.prototype.setAttr = function(tr, attrs) {
  return this._updateTransactionAndBind(tr).then(function(srvc) {
    return srvc.setAttr(_getTrId(tr), attrs);
  });
};
StoreObject.prototype.stat = function(tr) {
  return this._updateTransactionAndBind(tr).then(function(srvc) {
    return srvc.stat(_getTrId(tr));
  });
};
StoreObject.prototype.query = function(tr, query) {
  return this._updateTransactionAndBind(tr).then(function(srvc) {
    return _makeStreamWithErrors(srvc.query(_getTrId(tr), query));
  });
};
StoreObject.prototype.watch = function(query) {
  return this._bindPromise.then(function(srvc) {
    return _makeStreamWithErrors(srvc.watch(query));
  });
};
StoreObject.prototype.glob = function(pattern) {
  return this._bindPromise.then(function(srvc) {
    return _makeStreamWithErrors(srvc.glob(pattern));
  });
};
StoreObject.prototype.globT = function(tr, pattern) {
  return this._updateTransactionAndBind(tr).then(function(srvc) {
    return _makeStreamWithErrors(srvc.globT(_getTrId(tr), pattern));
  });
};

// Generate an object with the store automatically updated on it based on a
// query.
// Usage: (outdated)
// var obj = store.object('whatever').wire('query')
// console.log('Current val: ' + obj.a.val);
// obj.on('change', 'location') //Some mechanism to receive event notifications.
// obj.cancelUpdates();
// TODO(bprosnitz) Add this
StoreObject.prototype.wire = function(query) {
  //...
};

// Get an observable with updates from the query. Make it cancellable.
// TODO(bprosnitz) Add this
StoreObject.prototype.wireObservable = function(query) {
  //...
};

/**
 * Store represents the top level veyron store.
 * @param {object} client the veyron client
 * @constructor
 */
var Store = function(client) {
  if (!(this instanceof Store)) {
    return new Store(client);
  }
  this._client = client;
};

Store.prototype.bindTo = function(path) {
  var obj = new StoreObject(this._client, path);
  return obj._bindPromise.then(function() {
    return obj;
  });
};

module.exports = {};
module.exports.Store = Store;
module.exports.Transaction = Transaction;
