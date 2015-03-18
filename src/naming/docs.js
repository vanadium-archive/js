// TODO(toddw), TODO(aghassemi): The VDL prefix for these types might be going
// away soon

/**
 * MountFlag is a bit mask of options to the mount call.
 * @name MountFlag
 * @constructor
 * @param {integer} bitMask MountFlag bit mask
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
 * VDLMountedServer represents a server mounted on a specific name.
 * @name VDLMountedServer
 * @constructor
 * @param {Object} mountedServer
 * @param {string} mountedServer.server Server is the OA that's mounted.
 * @param {string[]} mountedServer.blessingPatterns Patterns that match the set
 * of blessings presented by the server listening on the above object address.
 * The type of this field would ideally be security.BlessingPattern,
 * but the resulting cyclic dependency between the security and naming
 * packages precludes that.
 * @param {integer} mountedServer.TTL TTL is the remaining time (in seconds)
 * before the mount entry expires.
 * @memberof module:vanadium.naming
 */

/**
 * VDLMountEntry represents a given name mounted in the mounttable.
 * @name VDLMountEntry
 * @constructor
 * @param {Object} mountEntry
 * @param {string} mountEntry.name Name is the mounted name.
 * @param {module:vanadium.naming.VDLMountedServer[]} mountEntry.servers Servers
 * (if present) specifies the mounted names.
 * @param {boolean} mountEntry.MT MT is true if the servers represent mount
 * tables
 * @memberof module:vanadium.naming
 */

/**
 * GlobError is returned by namespace.Glob to indicate a subtree of the
 * namespace that could not be traversed.
 * @name GlobError
 * @constructor
 * @param {Object} globError
 * @param {string} globError.name Name Root of the subtree.
 * @param {module.vanadium.errors.VanadiumError} globError.error The error that
 * occurred fulfilling the request.
 * @memberof module:vanadium.naming
 */

 /**
 * VDLGlobReply is the data type of the chan returned by Glob__.
 * It is a union type of MountEntry and GlobError
 * @name VDLGlobReply
 * @constructor
 * @param {Object} globReply
 * @param {module:vanadium.naming.VDLMountEntry} globReply.entry
 * @param {module:vanadium.naming.GlobError} globReply.error
 * @memberof module:vanadium.naming
 */