// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
/**
 * @fileoverview The AccessList authorizer
 * @private
 */
var blessingMatches = require('./blessing-matching');
var unwrap = require('../vdl/type-util').unwrap;
var makeError = require('../errors/make-errors');
var actions = require('../errors/actions');
var NoPermissionsError =
  require('../gen-vdl/v.io/v23/security/access').NoPermissionsError;

module.exports = authorizer;
var pkgPath = 'v.io/v23/security/access';
var MultipleTagsError = makeError(
  pkgPath + '.errMultipleMethodTags',
  actions.NO_RETRY,
  '{1:}{2:}PermissionsAuthorizer on {3}.{4} cannot handle multiple tags of ' +
  'type {5} ({6}); this is likely unintentional{:_}');
var NoTagsError = makeError(
  pkgPath + '.errNoMethodTags',
  actions.NO_RETRY,
  '{1:}{2:}PermissionsAuthorizer.Authorize called with an object ({3}, ' +
  'method {4}) that has no tags of type {5}; this is likely unintentional' +
  '{:_}');

/**
 * The AccessList authorizer.
 * @function
 * @memberof module:vanadium.security
 * @name aclAuthorizer
 * @param {module:vanadium.security.AccessList} acl The set of acls to apply.
 * @param {constructor} type The type of tags that this authorizer understands.
 * @return {Authorize} An authorizer that applies the acls.
 */
function authorizer(acl, type) {
  return function authorize(ctx) {
    // If the remoteBlessings is ourselves (i.e a self rpc), then we
    // always authorize.
    if (ctx.localBlessings && ctx.remoteBlessings &&
        ctx.localBlessings.publicKey === ctx.remoteBlessings.publicKey) {
      return null;
    }
    var tags = ctx.methodTags.filter(function(t) {
      return t instanceof type;
    });
    if (tags.length > 1) {
      return new MultipleTagsError(null, ctx.suffix, ctx.methods, type._type,
                                   ctx.methodTags);
    }

    if (tags.length === 0) {
      return new NoTagsError(null, ctx.suffix, ctx.methods, type._type,
                             ctx.methodTags);

    }

    var key = unwrap(tags[0]);
    var lists = acl.get(key);
    if (!lists || !canAccess(ctx.remoteBlessingStrings, lists.in,
                                lists.notIn)) {
      return new NoPermissionsError(null, ctx.remoteBlessingStrings, [], key);
    }
    return null;
  };
}

// Returns whether name passed in has permission for the passed in
// label.
function canAccess(names, inSet, notInSet) {
  // Remove the names that are blacklisted.
  var unblacklistedNames = names.filter(function(name) {
    return notInSet.every(function(pattern) {
      return !blessingMatches(name, pattern);
    });
  });
  // Check the remaining names for a match in the white list.
  return unblacklistedNames.some(function(name) {
    return inSet.some(function(pattern) {
      return blessingMatches(name, pattern);
    });
  });
}
