// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var extend = require('xtend');
/* jshint ignore:start */
/**
 * @summary Package access defines types and services for dynamic access
 * control in Vanadium.  Examples: "allow app to read this photo", "
 * prevent user from modifying this file".
 *
 * @description
 * <p>Package access defines types and services for dynamic access
 * control in Vanadium.  Examples: "allow app to read this photo", "
 * prevent user from modifying this file".</p>
 *
 * <h2>Target Developers</h2>
 *
 * <p>Developers creating functionality to share data or services between
 * multiple users/devices/apps.</p>
 *
 * <h2>Overview</h2>
 *
 * <p>Vanadium objects provide GetPermissions and SetPermissions methods.  An
 * [AccessList]{@link module:vanadium.security.access.AccessList}
 * (Access Control List) contains the set of blessings that grant
 * principals access to the object. All methods on objects can have "tags" on
 * them and the access control list used for the method is selected based on
 * that tag (from a
 * [Permissions]{@link module:vanadium.security.access.Permissions}).</p>
 *
 * <p>An object can have multiple names, so GetPermissions and SetPermissions
 * can be invoked on any of these names, but the object itself has a single
 * AccessList.</p>
 *
 * <p>SetPermissions completely replaces the Permissions. To perform an atomic
 * read-modify-write of the AccessList, use the etag parameter.</p>
 *
 * <h2>Conventions</h2>
 *
 * <p>Service implementors should follow the conventions below to be consistent
 * with other parts of Vanadium and with each other.</p>
 *
 * <p>All methods that create an object (e.g. Put, Mount, Link) should take an
 * optional AccessList parameter.  If the AccessList is not specified, the new
 * object, O, copies its AccessList from the parent.  Subsequent changes to the
 * parent AccessList are not automatically propagated to O.  Instead, a client
 * library must make recursive AccessList changes.</p>
 *
 * <p>Resolve access is required on all components of a name, except the last
 * one, in order to access the object referenced by that name.  For example,
 * for principal P to access the name "a/b/c", P must have resolve access to
 * "a" and "a/b". </p>
 *
 * <p>The Resolve tag means that a principal can traverse that component of the
 * name to access the child.  It does not give the principal permission to list
 * the children via Glob or a similar method.  For example, a server might have
 * an object named "home" with a child for each user of the system.  If these
 * users were allowed to list the contents of "home", they could discover the
 * other users of the system.  That could be a privacy violation.  Without
 * Resolve, every user of the system would need read access to "home" to access
 * "home/<user>".  If the user called Glob("home/*"), it would then be up to
 * the server to filter out the names that the user could not access.  That
 * could be a very expensive operation if there were a lot of children of
 * "home".  Resolve protects these servers against potential denial of service
 * attacks on these large, shared directories.</p>
 *
 * <p>Groups and blessings allow for sweeping access changes.  A group is suitable
 * for saying that the same set of principals have access to a set of unrelated
 * resources (e.g. docs, VMs, images).  See the Group API for a complete
 * description.  A blessing is useful for controlling access to objects that
 * are always accessed together.  For example, a document may have embedded
 * images and comments, each with a unique name.  When accessing a document,
 * the server would generate a blessing that the client would use to fetch the
 * images and comments; the images and comments would have this blessed
 * identity in their AccessLists.  Changes to the document's AccessList are therefore
 * "propagated" to the images and comments.</p>
 *
 * <p>Some services will want a concept of implicit access control.  They are free
 * to implement this as is best for their service.  However, GetPermissions should
 * respond with the correct AccessList.  For example, a corporate file server would
 * allow all employees to create their own directory and have full control
 * within that directory.  Employees should not be allowed to modify other
 * employee directories.  In other words, within the directory "home", employee
 * E should be allowed to modify only "home/E".  The file server doesn't know
 * the list of all employees a priori, so it uses an implementation-specific
 * rule to map employee identities to their home directory.</p>
 * @namespace
 * @name access
 * @memberof module:vanadium.security
 */
/* jshint ignore:end */
module.exports = extend(require('../../gen-vdl/v.io/v23/security/access'), {
  aclAuthorizer: require('./acl-authorizer')
});
