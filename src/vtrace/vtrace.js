// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var uniqueid = require('../lib/uniqueid');
var context = require('../runtime/context');
var vdl = require('../gen-vdl/v.io/v23/vtrace');

var spanKey = context.ContextKey();
var storeKey = context.ContextKey();

var second = 1000;
var minute = 60 * second;
var hour = 60 * minute;
var indentStep = '    ';

module.exports = {
  withNewTrace: withNewTrace,
  withContinuedTrace: withContinuedTrace,
  withNewSpan: withNewSpan,
  withNewStore: withNewStore,
  getSpan: getSpan,
  getStore: getStore,
  forceCollect: forceCollect,
  formatTraces: formatTraces,
  request: request,
  response: response
};

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
 * @summary A Span represents a named span of time.
 * @description
 * <p>Private constructor, use {@link module:vanadium.vtrace.getSpan}.</p>
 * Spans have a beginning and can contain annotations which mark
 * specific moments.
 * @constructor
 * @param {string} name The name of the Span.
 * @param {Object} store A vtrace Store instance.
 * @param {Object} trace A uniqueid.Id instance identifying the trace.
 * @param {Object} parent A uniqueid.Id instance identifying this Spans parent.
 * @memberof module:vanadium.vtrace
 * @inner
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
    trace = parent;
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
  record.id = this.id;
  for (var id in this.spans) {
    if (!this.spans.hasOwnProperty(id)) {
      continue;
    }
    var span = this.spans[id];
    record.spans.push(new vdl.SpanRecord(span));
  }
  return record;
};

/**
 * @summary Store collects the information of interesting traces in memory.
 * @description
 * Private constructor. Use {@link module:vanadium.vtrace.getStore} <br>
 * A vtrace Store.
 * A Store is responsible for saving traces for later reporting and analysis.
 * @constructor
 * @inner
 * @memberof module:vanadium.vtrace
 */
function Store() {
  if (!(this instanceof Store)) {
    return new Store();
  }

  this._collectRegexp = null;
  this._nodes = {};
}

/**
 * Filters the information collected by the Store
 * @param {string} regexp The regular expression that must
 * be matched by the span name in order for that span to be
 * collected
 */
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
 * @return {Array<module:vanadium.vtrace.TraceRecord>} An array of
 * vtrace.TraceRecord instances.
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
 * Returns a [TraceRecord]{@link module:vanadium.vtrace.TraceRecord} for
 * the given trace id.
 * @param {module:vanadium.uniqueId.Id} id A uniqueid.Id instance.
 * @return {module:vanadium.vtrace.TraceRecord} a vtrace.TraceRecord instance.
 */
Store.prototype.traceRecord = function(id) {
  var node = this._nodes[key(id)];
  if (!node) {
    var record = vdl.TraceRecord();
    record.id = id;
    return record;
  }
  return node.record();
};

// _getNode get's a trace node from the store.  shouldCreate
// is either a boolean or a function that returns a boolean.
// if shouldCreate or shouldCreate() is true, then we will create the node
// if it does not exist, otherwise we'll return null.
Store.prototype._getNode = function(traceid, shouldCreate) {
  var k = key(traceid);
  var node = this._nodes[k];
  if (node) {
    return node;
  }
  if (typeof shouldCreate === 'function') {
    shouldCreate = shouldCreate();
  }
  if (shouldCreate) {
    node = new Node(traceid);
    this._nodes[k] = node;
  }
  return node;
};

Store.prototype._getSpan = function(span, shouldCreate) {
  var node = this._getNode(span.trace, shouldCreate);
  if (!node) {
    return null;
  }
  var spankey = key(span.id);
  var record = node.spans[spankey];
  if (!record) {
    record = new vdl.SpanRecord();
    record.id = span.id;
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
    record.start = store._now();
  }
};

Store.prototype._finish = function(span) {
  var store = this;
  var record = this._getSpan(span, function() {
    var re = store._collectRegexp;
    return re && re.test(span.name);
  });
  if (record) {
    record.end = store._now();
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
    annotation.when = store._now();
    annotation.message = msg;
    record.annotations.push(annotation);
  }
};

Store.prototype._now = function() {
  return new Date();
};

/**
 * Merges a response into the store, adding information on the
 * Span in contains into the local database.
 * @param {module:vanadium.vtraceResponse} response A
 * [Response]{@link module.vanadium.vtraceResponse} instance.
 */
Store.prototype.merge = function(response) {
  if (!uniqueid.valid(response.trace.id)) {
    return;
  }
  var shouldCreate = (response.flags & vdl.CollectInMemory) !== 0;
  var node = this._getNode(response.trace.id, shouldCreate);
  if (!node) {
    return;
  }
  var spans = response.trace.spans;
  for (var i = 0; i < spans.length; i++) {
    var span = spans[i];
    node.spans[key(span.id)] = span;
  }
};

/**
 * Creates a new [Span]{@link module:vanadium.vtrace~Span} that represents
 * the beginning of a new trace and attaches it to a new context derived from
 * ctx.  This should be used when starting operations unrelated to other
 * ongoing traces.
 * @param {module:vanadium.context.Context} ctx A context.Context instance
 * to derive a new context from.
 * @return {module:vanadium.context.Context} A new context with a new Span
 * attached.
 * @memberof module:vanadium.vtrace
 */
function withNewTrace(ctx) {
  return ctx.withValue(spanKey, new Span('', ctx.value(storeKey)));
}

/**
 * Creates a new [Span]{@link module:vanadium.vtrace~Span} that continues
 * a trace represented in request. The new Span will be attached to the
 * returned context.
 * @param {module:vanadium.context.Context} ctx A context.Context instance to
 * derive a new context from.
 * @param {string} name The name of the new Span.
 * @param {module:vanadium.vtrace~Request} request A
 * [Request]{@link module:vanadium.vtrace~Request} instance.
 * @return {module:vanadium.context.Context} A new context with a new Span
 * attached.
 * @memberof module:vanadium.vtrace
 */
function withContinuedTrace(ctx, name, request) {
  var store = ctx.value(storeKey);
  if (request.flags & vdl.CollectInMemory !== 0) {
    store._getNode(request.traceId, true);
  }
  var span = new Span(name, store, request.traceId, request.spanId);
  return ctx.withValue(spanKey, span);
}

/**
 * Creates a new [Span]{@link module:vanadium.vtrace~Span} that continues
 * the trace attached to ctx.
 * @param {module:vanadium.context.Context} ctx A context.Context instance to
 * derive a new context from.
 * @param {string} name The name of the new Span.
 * @return {module:vanadium.context.Context} A new context with a new Span
 * attached.
 * @memberof module:vanadium.vtrace
 */
function withNewSpan(ctx, name) {
  var oldSpan = ctx.value(spanKey);
  var oldStore = ctx.value(storeKey);
  var span = new Span(name, oldStore, oldSpan.trace, oldSpan.id);
  return ctx.withValue(spanKey, span);
}

/**
 * Return the [Span]{@link module:vanadium.vtrace~Span} attached to ctx.
 * @param {module:vanadium.context.Context} ctx A context.Context instance.
 * @return {module:vanadium.vtrace.SpanRecord} A Span instance.
 * @memberof module:vanadium.vtrace
 */
function getSpan(ctx) {
  return ctx.value(spanKey);
}

/**
 * Creates a new [Store]{@link module:vanadium.vtrace~Store} and returns
 * a new context derived from ctx with the store attached.
 * @param {module:vanadium.context.Context} ctx A context.Context instance to
 * derive a new context from.
 * @return {module:vanadium.context.Context} A new context with a new Store
 * attached.
 * @memberof module:vanadium.vtrace
 */
function withNewStore(ctx) {
  var store = new Store();
  return ctx.withValue(storeKey, store);
}

/**
 * Return the Store attached to ctx.
 * @param {module:vanadium.context.Context} ctx A context.Context instance.
 * @return {module:vanadium.vtrace~Store} A {@link Store} instance.
 * @memberof module:vanadium.vtrace
 */
function getStore(ctx) {
  return ctx.value(storeKey);
}

/**
 * Force collection of the current trace.
 * @param {module:vanadium.context.Context} ctx A context.Context instance.
 * @memberof module:vanadium.vtrace
 */
function forceCollect(ctx) {
  var store = ctx.value(storeKey);
  var span = ctx.value(spanKey);
  store._getNode(span.trace, true);
}

/**
 * Generate a [Request]{@link module:vanadium.vtrace~Request} to send over
 * the wire.
 * @param {module:vanadium.context.Context} ctx A context.Context instance.
 * @return {module:vanadium.vtrace.Request} a
 * [Request]{@link module:vanadium.vtrace~Request} instance.
 * @memberof module:vanadium.vtrace
 */
function request(ctx) {
  var store = ctx.value(storeKey);
  var span = ctx.value(spanKey);
  return vdl.Request({
    spanId: span.id,
    traceId: span.trace,
    flags: store._flags(span.trace)
  });
}

/**
 * Generate a [Response]{@link module:vanadium.vtraceResponse} to send over the
 * wire.
 * @param {module:vanadium.context.Context} ctx A context.Context instance.
 * @return {module:vanadium.vtraceResponse} A
 * [Response]{@link module:vanadium.vtraceResponse} instance.
 * @memberof module:vanadium.vtrace
 */
function response(ctx) {
  var store = ctx.value(storeKey);
  var span = ctx.value(spanKey);
  return vdl.Response({
    flags: store._flags(span.trace),
    trace: store.traceRecord(span.trace)
  });
}

var zeroMs = Date.parse('0001-01-01');
// Returns true if the given date is the zero date, by the definition of VDL.
function isZeroDate(d) {
  return d.getTime() === zeroMs;
}

function Tree(span) {
  this._span = span;
  this._children = [];
}

function buildTree(record) {
  var t;
  var tid;
  var root;
  var earliest = new Date(zeroMs);
  var traceKey = key(record.id);

  var trees = {};
  record.spans.forEach(function(span) {
    // We want to find the lowest valid (non-zero) timestamp in the trace.
    // If we have a non-zero timestamp, save it if it's the earliest (or
    // this is the first valid timestamp we've seen).
    if (!isZeroDate(span.start)) {
      if (isZeroDate(earliest) || span.start < earliest) {
        earliest = span.start;
      }
    }
    tid = key(span.id);
    t = trees[tid];
    if (!t) {
      t = new Tree(span);
      trees[tid] = t;
    }

    var parentKey = key(span.parent);
    if (parentKey === traceKey) {
      root = t;
    } else {
      var parent = trees[parentKey];
      if (!parent) {
        parent = new Tree();
        trees[parentKey] = parent;
      }
      parent._children.push(t);
    }
  });

  // Sort the children of each node in start time order, and the
  // annotations in time order.
  for (tid in trees) {
    if (!trees.hasOwnProperty(tid)) {
      continue;
    }
    t = trees[tid];
    t._children.sort(function(a, b) {
      return a.start - b.start;
    });
    if (t._span && t._span.annotations) {
      t._span.annotations.sort(function(a, b) {
        return a.when - b.when;
      });
    }
  }

  // If we didn't find the root of the trace, create a stand-in.
  if (!root) {
    root = new Tree(new vdl.SpanRecord({
      name: 'Missing Root Span',
      start: earliest
    }));
  } else if (isZeroDate(root._span.start)) {
    root._span.start = earliest;
  }

  // Find all nodes that have no span.  These represent missing data
  // in the tree.  We invent fake "missing" spans to represent
  // (perhaps several) layers of missing spans.  Then we add these as
  // children of the root.
  var missing = [];
  for (tid in trees) {
    if (!trees.hasOwnProperty(tid)) {
      continue;
    }
    t = trees[tid];
    if (!t._span) {
      t._span = new vdl.SpanRecord({
        name: 'Missing Data'
      });
      missing.push(t);
    }
  }
  root._children = root._children.concat(missing);
  root._children.sort(function(a, b) {
    return a.start - b.start;
  });
  return root;
}

function formatDelta(when, start) {
  if (isZeroDate(when)) {
    return '??';
  }
  var out = '';
  var delta = when - start;
  if (delta === 0) {
    return '0';
  }
  if (delta < 0) {
    out += '-';
    delta = -delta;
  }
  if (delta < second) {
    return delta + 'ms';
  }
  if (delta > hour) {
    var hours = Math.floor(delta / hour);
    delta -= hours * hour;
    out += hours + 'h';
  }
  if (delta > minute) {
    var minutes = Math.floor(delta / minute);
    delta -= minutes * minute;
    out += minutes + 'm';
  }
  out += (delta / 1000) + 's';
  return out;
}


function formatTime(when) {
  if (isZeroDate(when)) {
    return '??';
  }
  return when.toISOString();
}

function formatAnnotations(annotations, traceStart, indent) {
  var out = '';
  for (var a = 0; a < annotations.length; a++) {
    var annotation = annotations[a];
    out += indent + '@' + formatDelta(annotation.when, traceStart);
    out += ' ' + annotation.message + '\n';
  }
  return out;
}

function formatTree(tree, traceStart, indent) {
  var span = tree._span;
  var out = indent + 'Span - ' + span.name;
  out += ' [id: ' + key(span.id).slice(24);
  out += ' parent: ' + key(span.parent).slice(24) + ']';
  out += ' (' + formatDelta(span.start, traceStart);
  out += ', ' + formatDelta(span.end, traceStart) + ')\n';

  indent += indentStep;
  out += formatAnnotations(span.annotations, traceStart, indent);
  for (var c = 0; c < tree._children.length; c++) {
    out += formatTree(tree._children[c], traceStart, indent);
  }
  return out;
}

function formatTrace(record) {
  var root = buildTree(record);
  if (!root) {
    return null;
  }
  var span = root._span;
  var out = 'Trace - ' + key(record.id);
  out += ' (' + formatTime(span.start) + ', ' + formatTime(span.end) + ')\n';
  out += formatAnnotations(span.annotations, span.start, indentStep);
  for (var c = 0; c < root._children.length; c++) {
    out += formatTree(root._children[c], span.start, indentStep);
  }
  return out;
}

/**
 * Return a string representation of a trace (or array of traces).
 * @param {Array<module:vanadium.vtrace.TraceRecord>} traces Trace records.
 * @return {string} a human friendly string representation of the trace.
 * @memberof module:vanadium.vtrace
 */
function formatTraces(traces) {
  if (!Array.isArray(traces)) {
    traces = [traces];
  }
  if (traces.length === 0) {
    return '';
  }
  var out = 'Vtrace traces:\n';
  for (var r = 0; r < traces.length; r++) {
    out += formatTrace(traces[r]);
  }
  return out;
}
