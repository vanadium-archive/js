// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @summary Namespace context defines an interface to carry
 * data that crosses API boundaries.
 *
 * @description
 * <p>Namespace context defines an interface to carry data that
 * crosses API boundaries. The context carries deadlines and
 * cancellation as well as other arbitrary values.</p>
 *
 * <p>Application code receives contexts in two main ways:
 * <ol>
 * <li>The runtime returned from vanadium.init() has a getContext() method.
 * This context will generally be used for stand-alone client programs.
 *   <pre>
 *     vanadium.init(function(err, runtime) {
 *       var ctx = runtime.getContext();
 *       doSomething(ctx);
 *     });
 *   </pre>
 * </li>
 * <li>The first parameter to every Vanadium server method implementation
 * is a Context.
 *   <pre>
 *     var MyService = {
 *       method: function(ctx, serverCall) {
 *         doSomething(ctx);
 *       }
 *     }
 *   </pre>
 * </li>
 * </ol></p>
 *
 * <p>Once you have a context you can derive further contexts to
 * change settings.  For example to adjust a deadline you might do:
 * </p>
 * <pre>
 *    vanadium.init(function(err, runtime) {
 *      var ctx = runtime.getContext();
 *      // We'll use cacheCtx to lookup data in memcache
 *      // if it takes more than a second to get data from
 *      // memcache we should just skip the cache and perform
 *      // the slow operation.
 *      var cacheCtx = context.withTimeout(ctx, 1000);
 *      fetchDataFromMemcache(cachCtx, key, function(err) {
 *        if (err) {
 *          // Here we use the original ctx, not the derived cacheCtx
 *          // so we aren't constrained by the 1 second timeout.
 *          recomputeData(ctx);
 *        }
 *      });
 *    });
 * </pre>
 *
 * <p>Contexts form a tree where derived contexts are children of the
 * contexts from which they were derived.  Children inherit all the
 * properties of their parent except for the property being replaced
 * (the deadline in the example above).</p>
 *
 * <p>Contexts are extensible.  The value/withValue methods allow you to attach
 * new information to the context and extend its capabilities.
 * In the same way we derive new contexts via the 'With' family of functions
 * you can create functions to attach new data:</p>
 *
 * <pre>
 *    function Auth() {
 *      // Construct my Auth object.
 *    }
 *
 *    var authKey = vanadium.context.ContextKey();
 *
 *    function setAuth(parent, auth) {
 *      return parent.withValue(authKey, auth);
 *    }
 *
 *    function getAuth(ctx) {
 *        return ctx.value(authKey);
 *    }
 * </pre>
 *
 * Note that all keys are of type ContextKey to prevent collisions.
 * By keeping your key unexported you can control how and when the
 * attached data changes.  For example you can ensure that only data
 * of the correct type is attached.
 * @namespace
 * @name context
 * @memberof module:vanadium
 */

var Deferred = require('../lib/deferred');
var Promise = require('../lib/promise');
var inherits = require('inherits');
var vError = require('../gen-vdl/v.io/v23/verror');
var ContextKey = require('../context/context-key');
var BigInt = require('../vdl/big-int');

module.exports = {
  Context: Context,
  ContextKey: ContextKey,
};

var CanceledError;
/**
 * @summary A Context carries deadlines, cancellation and data across API
 * boundaries.
 * @description
 * Generally application code should not call this constructor to
 * create contexts.  Instead it should call
 * [runtime.getContext]{@link module:vanadium~Runtime#getContext} or
 * use the context supplied as the first argument to server method
 * implementations.
 * @constructor
 * @memberof module:vanadium.context
 */
function Context() {
  if (!(this instanceof Context)) {
    return new Context();
  }
}

/**
 * Returns the time at which this context will be automatically
 * canceled.  If no deadline has been set, null is returned.
 * @return {Date} The Date corresponding to the deadline.
 */
Context.prototype.deadline = function() {
  return null;
};


/**
 * Returns true if the context has exceeded its deadline,
 * been cancelled, or been finished.
 * @return {boolean} True if the context is done.
 */
Context.prototype.done = function() {
  return false;
};

/**
 * Frees resources associated with the context without generating an error.
 * Only applicable to context objects returned from withCancel(). It does
 * nothing for other contexts.
 */
Context.prototype.finish = function() {
  // Do nothing for most contexts.
};

/**
 * Can be used to cancel the context and generate a
 * {@link module:vanadium.verror.CanceledError}.
 * Only applicable to context objects returned from withCancel(). It does
 * nothing for other contexts.
 */
Context.prototype.cancel = function() {
  // Do nothing for most contexts.
};

/**
 * Returns a promise that will be resolved when the context exceeds
 * its deadline, is cancelled, or is finished.  Optionally you can
 * pass a callback that will be run when the promise is resolved.
 * @param {module:vanadium~voidCb} [cb] If provided, the function
 * will be called on completion.
 * @return {Promise} Promise to be called on completion.
 */
Context.prototype.waitUntilDone = function(callback) {
  // The root context can never be cancelled, and therefore we
  // throw away the context and return a promise that will never
  // be resolved.
  return new Promise(function(){});
};

/**
 * Returns the value corresponding to the given key.  The
 * [value]{@link module:vanadium.context.Context#value}/
 * [withValue]{@link module:vanadium.context.Context#withValue}
 * methods can be used to attach data to context that
 * will be carried across API boundaries.  You should use this only
 * for data that is relevant across multiple API boundaries and not
 * just to pass extra parameters to functions and methods.  The key
 * must be an instance of ContextKey.  This function will return null
 * if there is no value associated with the given key.
 * @param {module:vanadium.context.ContextKey} key A ContextKey to look up.
 * @return {*} The value associated with the key, or null.
 */
Context.prototype.value = function(key) {
  return null;
};

/**
 * Returns a new context derived from the current context but that
 * will return the given value when value(key) is called with the
 * given key.
 * @param {module:vanadium.context.ContextKey} key A key.
 * @param {*} value A value to associate with the key.
 * @return {module:vanadium.context.Context} A new derived context.
 */
Context.prototype.withValue = function(key, value) {
  return new ValueContext(this, key, value);
};

/**
 * Returns a new context derived from the current context but that can
 * be cancelled.  The returned context will have two additional
 * methods [cancel()]{@link module:vanadium.context.Context#cancel} which
 * can be used to cancel the context and
 * generate a {@link module:vanadium.verror.CanceledError} and
 * [finish()]{@link module:vanadium.context.Context#finish} which
 * frees resources associated with the context without generating an error.
 * @return {module:vanadium.context.Context} A new derived cancellable context.
 */
Context.prototype.withCancel = function() {
  return new CancelContext(this);
};

/**
 * Returns a new context derived from the current context but that
 * will be automatically cancelled after a given deadline.  The
 * returned context will have an additional method cancel() which can
 * be used to cancel the context early.
 * @param {Date} deadline A date object which specifies the deadline.
 * @return {module:vanadium.context.Context} A new derived cancellable context.
 */
Context.prototype.withDeadline = function(deadline) {
  return new DeadlineContext(this, deadline);
};

/**
 * Returns a new context derived from the current context but that
 * will be automatically cancelled after a given timeout.  The
 * returned context will have an additional method cancel() which can
 * be used to cancel the context early.
 * @param {number} timeout A timeout in milliseconds.
 * @return {module:vanadium.context.Context} A new derived cancellable context.
 */
Context.prototype.withTimeout = function(timeout) {
  var msTimeout = timeout;
  if (timeout instanceof BigInt) {
    msTimeout = timeout.toNativeNumberApprox();
  }
  return new DeadlineContext(this, Date.now() + msTimeout);
};


// ChildContext is a the base class for other context specializations.
// It defers all its calls to its parent.
function ChildContext(parent) {
  this._parent = parent;
  Context.call(this);
}
inherits(ChildContext, Context);

ChildContext.prototype.deadline = function() {
  return this._parent.deadline();
};
ChildContext.prototype.done = function() {
  return this._parent.done();
};
ChildContext.prototype.waitUntilDone = function(callback) {
  return this._parent.waitUntilDone(callback);
};
ChildContext.prototype.value = function(key) {
  return this._parent.value(key);
};
ChildContext.prototype.finish = function() {
  return this._parent.finish();
};
ChildContext.prototype.cancel = function() {
  return this._parent.cancel();
};

// ValueContext is a context that associates a single key with a
// single value.
function ValueContext(parent, key, value) {
  if (!(key instanceof ContextKey)) {
    throw new vError.BadArgError(
      this,
      'Attempting to set a value on a context, ' +
      'but the key is not of type ContextKey.');
  }

  this._key = key;
  this._value = value;
  ChildContext.call(this, parent);
}
inherits(ValueContext, ChildContext);

ValueContext.prototype.value = function(key) {
  if (!(key instanceof ContextKey)) {
    throw new vError.BadArgError(
      this,
      ['Attempting to look up a value on a context, ' +
      'but the key is not of type ContextKey.']);
  }
  if (key._key === this._key._key) {
    return this._value;
  }
  return this._parent.value(key);
};

// cancellableAncestor walks up the tree of parent contexts to find
// the nearest ancestor that is cancellable.
function cancellableAncestor(parent) {
  for (; parent instanceof ChildContext; parent = parent._parent) {
    if (parent instanceof CancelContext) {
      return parent;
    }
  }
  // If we've reached the root, there is no cancellable ancestor.
  return null;
}

// A CancelContext is a context which can be cancelled.
function CancelContext(parent) {
  this._id = CancelContext._nextID;
  CancelContext._nextID++;

  this._done = false;
  this._deferred = new Deferred();
  this._children = {};

  // We need to arrange to be cancelled when our parent is.
  var ca = cancellableAncestor(parent);
  if (ca) {
    ca._children[this._id] = this;
  }

  ChildContext.call(this, parent);
}
inherits(CancelContext, ChildContext);

CancelContext._nextID = 0;

CancelContext.prototype.done = function() {
  return this._done;
};

CancelContext.prototype._cancel = function(error) {
  this._done = true;
  if (error) {
    this._deferred.reject(error);
  } else {
    this._deferred.resolve();
  }
  for (var id in this._children) {
    if (this._children.hasOwnProperty(id)) {
      this._children[id]._cancel(error);
    }
  }
  this._children = {};
};

CancelContext.prototype.cancel = function() {
  var ca = cancellableAncestor(this._parent);
  if (ca) {
    delete ca._children[this._id];
  }
  CanceledError = require('../gen-vdl/v.io/v23/verror').CanceledError;
  this._cancel(new CanceledError(this));
};

CancelContext.prototype.finish = function() {
  this._cancel(null);
};

CancelContext.prototype.waitUntilDone = function(callback) {
  this._deferred.addCallback(callback);
  return this._deferred.promise;
};

// A DeadlineContext cancels itself when its deadline is met.
function DeadlineContext(parent, deadline) {
  this._deadline = deadline;

  // deadline could be a BigInt. In order to use this timeout, it must be
  // converted to a native number.
  if (deadline instanceof BigInt) {
    this._deadline = deadline.toNativeNumberApprox();
  }

  this._timerID = setTimeout(this._expire.bind(this),
    this._deadline - Date.now());

  CancelContext.call(this, parent);
}
inherits(DeadlineContext, CancelContext);

DeadlineContext.prototype.deadline = function() {
  return this._deadline;
};

DeadlineContext.prototype._cancel = function(error) {
  clearTimeout(this._timerID);
  CancelContext.prototype._cancel.call(this, error);
};

DeadlineContext.prototype._expire = function(error) {
  this._cancel(new vError.TimeoutError(this));
};
