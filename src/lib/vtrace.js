/**
 * @fileoverview Vtrace implements cross process debug tracing.
 *
 * TODO(mattr): Write up usage docs once the implementation is further along.
 */

var uniqueid = require('./uniqueid');
var context = require('../runtime/context');
var vdl = require('../gen-vdl/v.io/v23/vtrace');
var time = require('../gen-vdl/v.io/v23/vdlroot/time');

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

var secondsPerDay = 86400;
var unixEpoch = (1969*365 + 1969/4 - 1969/100 + 1969/400) * secondsPerDay;

function toVDLTime(date) {
  var ms = date.getTime();
  var seconds = Math.floor(ms / 1000);
  var nanos = (ms % 1000) * 1000000;
  return time.Time({
    seconds: seconds + unixEpoch,
    nanos: nanos
  });
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

  this._nodes = {};
}

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

Store.prototype._getOrCreateNode = function(traceid) {
  var k = key(traceid);
  var node = this._nodes[k];
  if (!node) {
    node = new Node(traceid);
    this._nodes[k] = node;
  }
  return node;
};

Store.prototype._getOrCreateSpan = function(span) {
  var node = this._getOrCreateNode(span.trace);
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
  var record = this._getOrCreateSpan(span);
  record.start = toVDLTime(new Date());
};

Store.prototype._finish = function(span) {
  var record = this._getOrCreateSpan(span);
  record.end = toVDLTime(new Date());
};

Store.prototype._annotate = function(span, msg) {
  var record = this._getOrCreateSpan(span);
  var annotation = new vdl.Annotation();
  annotation.when = toVDLTime(new Date());
  annotation.message = msg;
  record.annotations.push(annotation);
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
  var node = this._getOrCreateNode(response.trace.iD);
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
