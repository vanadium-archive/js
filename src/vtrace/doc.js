// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * Trace record
 * @name TraceRecord
 * @constructor
 * @property {module:vanadium.uniqueId.Id} id
 * @property {module:vanadium.vtrace.SpanRecord[]} spans
 * @memberof module:vanadium.vtrace
 */

/**
 * An Annotation represents data that is relevant at a specific moment.
 * They can be attached to spans to add useful debugging information.
 * @name Annotation
 * @constructor
 * @property {Date} when When the annotation was added.
 * @property {string} message The annotation.
 * message.
 * @memberof module:vanadium.vtrace
 */

/**
 * A SpanRecord is the wire format for a Span.
 * @name SpanRecord
 * @constructor
 * @property {module:vanadium.uniqueId.Id} id The Id of the Span.
 * @property {module:vanadium.uniqueId.Id} parent The Id of this Span's parent.
 * @property {string} name The Name of this span.
 * @property {Date} start The start time of this span.
 * @property {Date} end The end time of this span.
 * @property {module:vanadium.vtrace.Annotation[]} annotations A series of
 * annotations.
 * @memberof module:vanadium.vtrace
 */

/**
 * TraceFlags
 * @name TraceFlags
 * @constructor
 * @param {integer} flag
 * @memberof module:vanadium.vtrace
 */

/**
 * Request is attached to RPC calls to request that servers reply with trace
 * information.
 * Private constructor. Use {@link module:vanadium.vtrace.request} to create
 * an instance.
 * @name Request
 * @constructor
 * @property {module:vanadium.uniqueId.Id} spanId The Id of the span that
 * originated the RPC call.
 * @property {module:vanadium.uniqueId.Id} traceId The Id of the trace this call
 * is a part of.
 * @property {module:vanadium.vtrace.TraceFlags} flags
 */

/**
 * Response is attached to RPC responses and provides the caller with tracing
 * information for the completed call.
 * Private constructor. Use {@link module:vanadium.vtrace.response} to create
 * an instance.
 * @name Response
 * @constructor
 * @property {module:vanadium.vtrace.TraceFlags} flags Flags give options for
 * trace collection, the client should alter its collection for this trace
 * according to the flags sent back from the originated the RPC call.
 * @property {module:vanadium.vtrace.TraceRecord} trace Trace is collected
 * trace data.  This may be empty.
 */