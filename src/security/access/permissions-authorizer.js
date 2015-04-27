// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
/**
 * @fileoverview The Permissions authorizer
 * @private
 */
var blessingMatches = require('./blessing-matching');
var unwrap = require('../../vdl/type-util').unwrap;
var makeError = require('../../verror/make-errors');
var actions = require('../../verror/actions');
var vdlAccess = require('../../gen-vdl/v.io/v23/security/access');
var NoPermissionsError = vdlAccess.NoPermissionsError;
var Permissions = vdlAccess.Permissions;

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
 * The Permissions authorizer.
 * @function
 * @memberof module:vanadium.security.access
 * @name permissionsAuthorizer
 * @param {module:vanadium.security.access.Permissions} perms The set of
 * permission to apply.
 * @param {function} type The type constructor function of tags that this
 * authorizer understands.
 * @return {module:vanadium.security.Authorize} An authorizer that applies
 * the perms.
 */
function authorizer(perms, type) {
  // Force the Permissions to have the correct Permissions format.
  var permissions = unwrap(new Permissions(perms));

  return function authorize(ctx, call) {
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
