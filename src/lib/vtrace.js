/**
 * @fileoverview Vtrace implements cross process debug tracing.
 * TODO(mattr): Write up usage docs once the implementation is further along.
 * @private
 */

var uniqueid = require('./uniqueid');
var context = require('../runtime/context');
var vdl = require('../gen-vdl/v.io/v23/vtrace');

var spanKey = context.ContextKey();
var storeKey = context.ContextKey();

/**
 * Create a map key from a uniqueid.Id.
 * @private
 * @param {Object} A uniqueid.Id instance.
 * @return {string} A string key for use as a map key.
 */
function key(id) {
  return uniqueid.toHexString(id);
}

/**
 * A vtrace Span.
 * A Span represents a named span of time, it has a beginning and and
 * end.  Spans can contain annotations wich mark specific moments.
 * @constructor
 * @param {string} name The name of the Span.
 * @param {Object} store A vtrace Store instance.
 * @param {Object} trace A uniqueid.Id instance identifying the trace.
 * @param {Object} parent A uniqueid.Id instance identifying this Spans parent.
 */
function Span(name, store, trace, parent) {
  if (!(this instanceof Span)) {
    return new Span(name, trace, parent, store);
  }

  Object.defineProperty(this, 'name', {
    writable: false,
    value: name
  });
  Object.defineProperty(this, 'id', {
    writable: false,
    value: uniqueid.random()
  });

  if (trace === undefined && parent === undefined) {
    parent = uniqueid.random();
    trace = uniqueid.random();
  }
  Object.defineProperty(this, 'parent', {
    writable: false,
    value: parent
  });
  Object.defineProperty(this, 'trace', {
    writable: false,
    value: trace
  });

  this._store = store;
  store._start(this);
}

/**
 * Adds an annotation to the Span.
 * @param {string} msg A string annotation.
 */
Span.prototype.annotate = function(msg) {
  this._store._annotate(this, msg);
};

/**
 * Marks the current Span as finished, recording the end time.
 */
Span.prototype.finish = function() {
  this._store._finish(this);
};

function Node(id) {
  this.id = id;
  this.spans = {};
}

Node.prototype.record = function() {
  var record = new vdl.TraceRecord();
  record.iD = this.id;
  for (var id in this.spans) {
    if (!this.spans.hasOwnProperty(id)) {
      continue;
    }
    var span = this.spans[id];
    record.spans.push(new vdl.SpanRecord(span));
  }
  return record;
};

// TODO(mattr): Support filtering.  Right now this store records everything.
/**
 * A vtrace Store.
 * A Store is responsable for saving traces for later reporting and analysis.
 * @constructor
 */
function Store() {
  if (!(this instanceof Store)) {
    return new Store();
  }

  this._collectRegexp = null;
  this._nodes = {};
}

Store.prototype.setCollectRegexp = function(regexp) {
  this._collectRegexp = new RegExp(regexp);
};

Store.prototype._flags = function(id) {
  var node = this._nodes[key(id)];
  if (!node) {
    return vdl.Empty;
  }
  return vdl.CollectInMemory;
};

/**
 * Returns vtrace.TraceRecord instances for all traces recorded by the store.
 * @return {Array} An array of vtrace.TraceRecord instances.
 */
Store.prototype.traceRecords = function() {
  var out = [];
  for (var key in this._nodes) {
    if (!this._nodes.hasOwnProperty(key)) {
      continue;
    }
    out.push(this._nodes[key].record());
  }
  return out;
};

/**
 * Returns a vtrace.TraceRecord for the given trace id.
 * @param {Object} id A uniqueid.Id instance.
 * @return {Array} A vtrace.TraceRecord instance.
 */
Store.prototype.traceRecord = function(id) {
  var node = this._nodes[key(id)];
  if (!node) {
    var record = vdl.TraceRecord();
    record.iD = id;
    return record;
  }
  return node.record();
};

// _getNode get's a trace node from the store.  force
// is either a boolean or a function that returns a boolean.
// if force or force() is true, then we will create the node
// if it does not exist, otherwise we'll return null.
Store.prototype._getNode = function(traceid, force) {
  var k = key(traceid);
  var node = this._nodes[k];
  if (node) {
    return node;
  }
  if (typeof force === 'function') {
    force = force();
  }
  if (force) {
    node = new Node(traceid);
    this._nodes[k] = node;
  }
  return node;
};

Store.prototype._getSpan = function(span, force) {
  var node = this._getNode(span.trace, force);
  if (!node) {
    return null;
  }
  var spankey = key(span.id);
  var record = node.spans[spankey];
  if (!record) {
    record = new vdl.SpanRecord();
    record.iD = span.id;
    record.parent = span.parent;
    record.name = span.name;
    node.spans[spankey] = record;
  }
  return record;
};

Store.prototype._start = function(span) {
  var store = this;
  var record = this._getSpan(span, function() {
    var re = store._collectRegexp;
    return re && re.test(span.name);
  });
  if (record) {
    record.start = new Date();
  }
};

Store.prototype._finish = function(span) {
  var store = this;
  var record = this._getSpan(span, function() {
    var re = store._collectRegexp;
    return re && re.test(span.name);
  });
  if (record) {
    record.end = new Date();
  }
};

Store.prototype._annotate = function(span, msg) {
  var store = this;
  var record = this._getSpan(span, function() {
    var re = store._collectRegexp;
    return re && re.test(msg);
  });
  if (record) {
    var annotation = new vdl.Annotation();
    annotation.when = new Date();
    annotation.message = msg;
    record.annotations.push(annotation);
  }
};

/**
 * Merges a vtrace.Response into the store, adding information on the
 * Span in contains into the local database.
 * @param {Object} response A vtrace.Response instance.
 */
Store.prototype.merge = function(response) {
  if (!uniqueid.valid(response.trace.iD)) {
    return;
  }
  var force = (response.flags & vdl.CollectInMemory) !== 0;
  var node = this._getNode(response.trace.iD, force);
  if (!node) {
    return;
  }
  var spans = response.trace.spans;
  for (var i = 0; i < spans.length; i++) {
    var span = spans[i];
    node.spans[key(span.iD)] = span;
  }
};

/**
 * Creates a new Span that represents the beginning of a new trace
 * and attaches it to a new context derived from ctx.  This should be used
 * when starting operations unrelated to other ongoing traces.
 * @param {Object} ctx A context.Context instance to derive a new context from.
 * @return {Object} A new context with a new Span attached.
 */
module.exports.withNewTrace = function(ctx) {
  return ctx.withValue(spanKey, new Span('', ctx.value(storeKey)));
};

/**
 * Creates a new Span that continues a trace represented in request.
 * The new Span will be attached to the returned context.
 * @param {Object} ctx A context.Context instance to derive a new context from.
 * @param {string} name The name of the new Span.
 * @param {Object} request A vtrace.Request instance.
 * @return {Object} A new context with a new Span attached.
 */
module.exports.withContinuedTrace = function(ctx, name, request) {
  var store = ctx.value(storeKey);
  var span = new Span(name, store, request.traceID, request.spanID);
  return ctx.withValue(spanKey, span);
};

/**
 * Creates a new Span that continues the trace attached to ctx.
 * @param {Object} ctx A context.Context instance to derive a new context from.
 * @return {Object} A new context with a new Span attached.
 */
module.exports.withNewSpan = function(ctx, name) {
  var oldSpan = ctx.value(spanKey);
  var span = new Span(name, oldSpan._store, oldSpan.trace, oldSpan.id);
  return ctx.withValue(spanKey, span);
};

/**
 * Return the Span attached to ctx.
 * @param {Object} ctx A context.Context instance.
 * @return {Object} A Span instance.
 */
module.exports.getSpan = function(ctx) {
  return ctx.value(spanKey);
};

/**
 * Creates a new Store and returns a new context derived from ctx with the
 * store attached.
 * @param {Object} ctx A context.Context instance to derive a new context from.
 * @return {Object} A new context with a new Store attached.
 */
module.exports.withNewStore = function(ctx) {
  var store = new Store();
  return ctx.withValue(storeKey, store);
};

/**
 * Return the Store attached to ctx.
 * @param {Object} ctx A context.Context instance.
 * @return {Object} A Store instance.
 */
module.exports.getStore = function(ctx) {
  return ctx.value(storeKey);
};

/**
 * Force collection of the current trace.
 * @param {Object} ctx A context.Context instance.
 */
module.exports.forceCollect = function(ctx) {
  var store = ctx.value(storeKey);
  var span = ctx.value(spanKey);
  store._getNode(span.trace, true);
};

/**
 * Generate a vtrace.Request to send over the wire.
 * @param {Object} ctx A context.Context instance.
 */
module.exports.request = function(ctx) {
  var store = ctx.value(storeKey);
  var span = ctx.value(spanKey);
  return vdl.Request({
    spanID: span.id,
    traceID: span.trace,
    flags: store._flags(span.trace)
  });
};
