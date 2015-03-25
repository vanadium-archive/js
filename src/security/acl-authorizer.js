// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview The AccessList authorizer
 * @private
 */
var blessingMatches = require('./blessing-matching');
var vError = require('./../gen-vdl/v.io/v23/verror');
var context = require('../runtime/context');

module.exports = authorizer;

/**
 * The AccessList authorizer.
 * @function
 * @memberof module:vanadium.security
 * @name aclAuthorizer
 * @param {module:vanadium.security.AccessList} acl The set of acls to apply.
 * @return {Authorize} An authorizer that applies the acls.
 */
function authorizer(acl) {
  return function authorize(ctx) {
    // If the remoteBlessings is ourselves (i.e a self rpc), then we
    // always authorize.
    if (ctx.localBlessings && ctx.remoteBlessings &&
        ctx.localBlessings.publicKey === ctx.remoteBlessings.publicKey) {
      return null;
    }
    var remoteNames = ctx.remoteBlessingStrings;
    if ((remoteNames === undefined || remoteNames.length === 0) &&
         canAccessAccessList('', ctx.label, acl)) {
       return null;
    }
    for (var i = 0; i < remoteNames.length; i++) {
      if (canAccessAccessList(remoteNames[i], ctx.label, acl)) {
        return null;
      }
    }
    // TODO(bjornick): find the right context.
    return new vError.NoAccessError(new context.Context());
  };
}

// Returns whether name passed in has permission for the passed in
// label.
function canAccessAccessList(name, label, acl) {
  // The set of labels that are allowed for
  // the given names.
  var pattern;
  var patLabels;
  var isAllowed = false;

  // Add all the inclusive patterns.
  for (pattern in acl.in) {
    if (!acl.in.hasOwnProperty(pattern)) {
      continue;
    }
    patLabels = acl.in[pattern];
    if (blessingMatches(name, pattern)) {
      if (patLabels.indexOf(label) !== -1) {
        isAllowed = true;
        break;
      }
    }
  }

  // If the names didn't match of the in patterns, then they are
  // rejected.
  if (!isAllowed) {
    return false;
  }

  for (pattern in acl.notIn) {
    if (!acl.notIn.hasOwnProperty(pattern)) {
      continue;
    }
    patLabels = acl.notIn[pattern];
    if (blessingMatches(name, pattern)) {
      if (patLabels.indexOf(label) !== -1) {
        return false;
      }
    }
  }

  return true;
}
