// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*
 * A file for JSDocs for vdl generated files in security/access
 */
/**
 * @summary AccessList represents an Access Control List - a set of blessings
 * that should be granted access.
 * @name AccessList
 * @constructor
 * @property {array} in <p>An array of [BlessingPatterns]{@link
 * module:vanadium.security.BlessingPatterns}/strings that denotes the set
 * of blessings that should be granted access, unless blacklisted by notIn.</p>
 * <p>For example:</p>
 * <code>
 *    in: ['alice/family']
 * </code><p>
 * grants access to a principal that presents at least one of 'alice/family',
 * 'alice/family/friend', 'alice/family/friend/spouse', etc.</p>
 * @property {array} notIn <p>An array of strings that denotes the set of
 * blessings (and their delegates) that have been explicitly blacklisted
 * from the in set.
 * <p>For example:</p>
 * <code>
 *    in: ['alice/friend'], notIn: ['alice/friend/bob']
 * </code><p>
 * grants access to a principal that presents at least one of 'alice/friend',
 * 'alice/friend/carol', etc, but NOT to a principal that presents
 * 'alice/friend/bob or 'alice/friend/bob/spouse' etc.</p>
 * @param {object} acl The value to construct from
 * @param {array} acl.in An array of [BlessingPatterns]{@link
 * module:vanadium.security.BlessingPatterns}/strings that denotes the set
 * of blessings that should be granted access, unless blacklisted by notIn.
 * @param {array} acl.notNin <p>An array of strings that denotes the set of
 * blessings (and their delegates) that have been explicitly blacklisted
 * from the in set.
 * @memberof module:vanadium.security.access
 */
/*jshint ignore:start*/
/**
 * @summary Permissions maps string tags to
 * [AccessList]{@link module:vanadium.security.access.AccessList}
 * specifying the blessings required to invoke methods with that tag.
 * @description
 * <p>These tags are meant to add a layer of interposition between the set of users
 * (blessings, specifically) and the set of methods, much like "Roles" do in
 * [Role Based Access Control]{@link (http://en.wikipedia.org/wiki/Role-based_access_control)}.
 * @property {map} val An ES6 map of string tags to
 * [AccessList]{@link module:vanadium.security.access.AccessList}
 * @name Permissions
 * @constructor
 * @param {map} permissions An ES6 Map of string tags to AccessLists
 * @memberof module:vanadium.security.access
 */
/*jshint ignore:end*/
/**
 * @summary Tag is used to associate methods with an
 * [AccessList]{@link module:vanadium.security.access.AccessList} in
 * [Permissions]{@link module:vanadium.security.access.Permissions}.
 * @name Tag
 * @constructor
 * @param {string} val The value of the tag
 * @memberof module:vanadium.security.access
 */
/**
 * Used for operations that require privileged access for object
 * administration.
 * @name Admin
 * @type module:vanadium.security.access.Tag
 * @memberof module:vanadium.security.access
 */
/**
 * Used for operations that return debugging information about the object
 * @name Debug
 * @type module:vanadium.security.access.Tag
 * @memberof module:vanadium.security.access
 */
/**
 * Used for operations that do not mutate the state of the object
 * @name Read
 * @type module:vanadium.security.access.Tag
 * @memberof module:vanadium.security.access
 */
/**
 * Used for operations that mutate the state of the object.
 * @name Write
 * @type module:vanadium.security.access.Tag
 * @memberof module:vanadium.security.access
 */
/**
 * Used for operations that involve namespace navigation
 * @name Resolve
 * @type module:vanadium.security.access.Tag
 * @memberof module:vanadium.security.access
 */
/**
 * @summary Error that means the
 * [AccessList]{@link module:vanadium.security.access.AccessList} is too big.
 * @name TooBigError
 * @memberof module:vanadium.security.access
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary Error that means that no blessings matched patterns in the
 * access list.
 * @name AccessListMatchError
 * @memberof module:vanadium.security.access
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {array} validBlessings A list of strings that represent valid
 * blessings
 * @param {array} rejectedBlessings A list of blessings that are rejected.
 * The array has [RejectedBlessings]
 * {@link module:vanadium.security.RejectedBlessings}.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary Error that means that no blessings have access to the specified
 * access tag (e.g. No Read Access or No Admin Access)
 * @name NoPermissionsError
 * @memberof module:vanadium.security.access
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {array} validBlessings A list of strings that represent valid
 * blessings
 * @param {array} rejectedBlessings A list of blessings that are rejected.
 * The array has [RejectedBlessings]
 * @param {module:vanadium.security.access.Tag} tag Access tag.
 * {@link module:vanadium.security.RejectedBlessings}.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.verror.VanadiumError
 */
