// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @summary MountFlag is a bit mask of options to the mount call.
 * @name MountFlag
 * @constructor
 * @param {number} bitMask MountFlag bit mask, which should be an integer.
 * @memberof module:vanadium.naming
 */

/**
 * Replace means the mount should replace what is currently at the mount point
 * @name Replace
 * @constant
 * @type {module:vanadium.naming.MountFlag}
 * @memberof module:vanadium.naming
 */

/**
 * MT means that the target server is a mount table.
 * @name MT
 * @constant
 * @type {module:vanadium.naming.MountFlag}
 * @memberof module:vanadium.naming
 */

/**
 * @summary MountedServer represents a server mounted on a specific name.
 * @name MountedServer
 * @constructor
 * @property {string} server Server is the object address that's mounted.
 * @property {module:vanadium.vdl.time.WireDeadline} deadline deadline before
 * the mount entry expires.
 * @param {object} mountedServer
 * @param {string} mountedServer.server Server is the OA that's mounted.
 * @param {module:vanadium.vdl.time.WireDeadline} mountedServer.deadline
 * deadline before the mount entry expires.
 * @memberof module:vanadium.naming
 */

/**
 * @summary MountEntry represents a given name mounted in the mounttable.
 * @name MountEntry
 * @constructor
 * @property {string} name The name of the entry.
 * @property {module:vanadium.naming.MountedServer[]} servers Servers
 * (if present) specifies the mounted names.
 * @property {boolean} servesMountTable servesMountTable is true if servers
 * represents mount tables.
 * @property {boolean} isLeaf True iff this entry represents a leaf object.
 * @param {object} mountEntry
 * @param {string} mountEntry.name Name is the mounted name.
 * @param {module:vanadium.naming.MountedServer[]} mountEntry.servers Servers
 * (if present) specifies the mounted names.
 * @param {boolean} mountEntry.servesMountTable servesMountTable is true if the
 * servers represent mount tables.
 * @param {boolean} mountEntry.isLeaf True iff this entry represents a leaf
 * object.
 * @memberof module:vanadium.naming
 */

/**
 * @summary GlobError is returned by
 * [namespace.glob]{@link module:vanadium~Namespace#glob} to indicate a subtree
 * of the namespace that could not be traversed.
 * @name GlobError
 * @constructor
 * @property {string} name Name Root of the subtree
 * @property {module:vanadium.verror.VanadiumError} error The error that
 * occurred fulfilling the request.
 * @param {object} globError
 * @param {string} globError.name Name Root of the subtree.
 * @param {module.vanadium.verror.VanadiumError} globError.error The error that
 * occurred fulfilling the request.
 * @memberof module:vanadium.naming
 */

 /**
 * @summary GlobReply is the data type of the chan returned by __glob.
 * @description It is a union type of MountEntry and GlobError and so
 * only one of the fields will be set.
 * @name GlobReply
 * @constructor
 * @property {module:vanadium.naming.MountEntry} entry
 * @property {module:vanadium.naming.GlobError} error
 * @param {object} globReply
 * @param {module:vanadium.naming.MountEntry} globReply.entry
 * @param {module:vanadium.naming.GlobError} globReply.error
 * @memberof module:vanadium.naming
 */
