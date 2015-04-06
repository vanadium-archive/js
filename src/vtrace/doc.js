// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @summary Namespace vtrace defines a system for collecting debugging
 * information about operations that span a distributed system.
 * @description
 * <p> Namespace vtrace defines a system for collecting debugging
 * information about operations that span a distributed system.  We
 * call the debugging information attached to one operation a Trace.
 * A Trace may span many processes on many machines.</p>
 *
 * <p>Traces are composed of a hierarchy of Spans.  A span is a named
 * timespan, that is, it has a name, a start time, and an end time.
 * For example, imagine we are making a new blog post.  We may have to
 * first authentiate with an auth server, then write the new post to a
 * database, and finally notify subscribers of the new content.  The
 * trace might look like this:</p>
 *
 * <pre>
 *    Trace:
 *    <---------------- Make a new blog post ----------->
 *    |                  |                   |
 *    <- Authenticate -> |                   |
 *                       |                   |
 *                       <-- Write to DB --> |
 *                                           <- Notify ->
 *    0s                      1.5s                      3s
 * </pre>
 *
 * <p>Here we have a single trace with four Spans.  Note that some
 * Spans are children of other Spans.  Vtrace works by attaching data
 * to a Context, and this hierarchical structure falls directly out
 * of our building off of the tree of Contexts.  When you derive a new
 * context using withNewSpan(), you create a Span that's a child of the
 * currently active span in the context.  Note that spans that share a
 * parent may overlap in time.</p>
 *
 * <p>In this case the tree would have been created with code like this:</p>
 *
 * <pre>
 *    function makeBlogPost(ctx) {
 *        var authCtx = vtrace.withNewSpan(ctx, "Authenticate")
 *        authenticate(authCtx).then(function() {
 *          var writeCtx = vtrace.withNewSpan(ctx, "Write To DB")
 *          write(writeCtx)
 *        }).then(function() {
 *          var notifyCtx = vtrace.withNewSpan(ctx, "Notify")
 *          notify(notifyCtx)
 *        });
 *    }
 * </pre>
 *
 * <p>Just as we have Spans to represent time spans we have Annotations
 * to attach debugging information that is relevant to the current
 * moment. You can add an annotation to the current span by calling
 * the Span's Annotate method:</p>
 *
 * <pre>
 *    var span = vtrace.getSpan(ctx)
 *    span.annotate("Just got an error")
 * </pre>
 *
 * <p>When you make an annotation we record the annotation and the time
 * when it was attached.</p>
 *
 * <p>Traces can be composed of large numbers of spans containing data
 * collected from large numbers of different processes.  Always
 * collecting this information would have a negative impact on
 * performance.  By default we don't collect any data.  If a
 * particular operation is of special importance you can force it to
 * be collected by calling a Spans forceCollect method.  You can also
 * call:
 *   <pre>
 *     vtrace.getStore(ctx).setCollectRegexp("regular.*expression")
 *   </pre>
 * which causes us to record any matching trace.</p>
 *
 * <p>If your trace has collected information you can retrieve the data
 * collected so far with the Store's traceRecord and traceRecords methods.</p>
 *
 * <p>By default contexts obtained from runtime.getContext() or from
 * the first parameter of a server method implementation already have
 * an initialized Trace.  The functions in this package allow you to
 * add data to existing traces or start new ones.</p>
 * @namespace
 * @name vtrace
 * @memberof module:vanadium
 */

/**
 * @summary A TraceRecord is the wire format for a Trace.
 * @name TraceRecord
 * @constructor
 * @property {module:vanadium.uniqueId.Id} id
 * @property {module:vanadium.vtrace.SpanRecord[]} spans
 * @memberof module:vanadium.vtrace
 */

/**
 * @summary An Annotation represents data that is relevant at a specific moment.
 * @description
 * Private Constructor, call {@link module:vanadium.vtrace.Span#annotate}
 * @name Annotation
 * @constructor
 * @property {Date} when When the annotation was added.
 * @property {string} message The annotation.
 * message.
 * @memberof module:vanadium.vtrace
 */

/**
 * @summary A SpanRecord is the wire format for a Span.
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
 * @summary TraceFlags specify options for how traces should be collected.
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
