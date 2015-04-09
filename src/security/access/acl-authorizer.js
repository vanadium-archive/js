// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
/**
 * @fileoverview The AccessList authorizer
 * @private
 */
var blessingMatches = require('./blessing-matching');
var unwrap = require('../../vdl/type-util').unwrap;
var makeError = require('../../errors/make-errors');
var actions = require('../../errors/actions');
var vdlAccess = require('../../gen-vdl/v.io/v23/security/access');
var NoPermissionsError = vdlAccess.NoPermissionsError;
var Permissions = vdlAccess.Permissions;
var getSecurityCallFromContext =
  require('../context').getSecurityCallFromContext;

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
 * @param {module:vanadium.security.Permissions} acls The set of acls to apply.
 * @param {constructor} type The type of tags that this authorizer understands.
 * @return {Authorize} An authorizer that applies the acls.
 */
function authorizer(acls, type) {
  // Force the acls to have the correct Permissions format.
  var permissions = unwrap(new Permissions(acls));

  return function authorize(ctx) {
    var call = getSecurityCallFromContext(ctx);
    // If the remoteBlessings has a public key, and it refers to ourselves
    // (i.e a self rpc), then we always authorize.
    if (call.remoteBlessings.publicKey &&
        call.localBlessings.publicKey === call.remoteBlessings.publicKey) {
      return;
    }
    var tags = call.methodTags.filter(function(t) {
      return t instanceof type;
    });
    if (tags.length > 1) {
      throw new MultipleTagsError(ctx, call.suffix, call.method, type._type,
                                   call.methodTags);
    }

    if (tags.length === 0) {
      throw new NoTagsError(ctx, call.suffix, call.method, type._type,
                             call.methodTags);

    }

    var key = unwrap(tags[0]);
    var lists = permissions.get(key);
    if (!lists || !canAccess(call.remoteBlessingStrings, lists.in,
                                lists.notIn)) {
      throw new NoPermissionsError(ctx, call.remoteBlessingStrings, [], key);
    }
    return;
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
