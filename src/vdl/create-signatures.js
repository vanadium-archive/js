// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview A method to create an array of signatures for a service
 * based on the descriptions passed in.
 * @private
 */
module.exports = createSignatures;

var stringify = require('./stringify');
var capitalize = require('./util').capitalize;
var Signature = require('./signature');

function sigsHaveMethod(sigs, method) {
  return sigs.some(function(sig) {
    return sig.methods.some(function(elem) {
      return elem.name === method;
    });
  });
}

function createSignatures(service, descs) {
  if (!Array.isArray(descs)) {
    if (typeof descs !== 'object') {
      descs = [];
    } else {
      descs = [descs];
    }
  }

  var sigs = descs.map(function(desc) {
    return new Signature(service, desc);
  });
  // Find any methods that are in service that are not in any of the
  // signatures generated and then generate a signature that contains
  // those methods.
  var leftOverSig = {
    methods: []
  };
  for (var methodName in service) {
    if (typeof service[methodName] === 'function') {
      var name = capitalize(methodName);
      if (!sigsHaveMethod(sigs, name)) {
        leftOverSig.methods.push({ name: name });
      }
    }
  }

  // TODO(bjornick): How terrible is it to create this leftover signature if the
  // user provided a description and thought (incorrectly) that it was complete?
  if (leftOverSig.methods.length > 0) {
    sigs.push(new Signature(service, leftOverSig));
  }

  checkForConflicts(sigs);
  return sigs;
}

// Looks through all the InterfaceSigs and makes sure any duplicate methods
// have the signature.  Throws if there are any conflicts.
function checkForConflicts(sigs) {
  // Keep track of the methods sigs seen so far.  The key is the method name.
  // the value is the an object containing the interface name under the key
  // 'interfaceName' and the method signature under the key 'sig'.
  var methodsSeen = {};
  sigs.forEach(function(sig) {
    sig.methods.forEach(function(method) {
      if (methodsSeen[method.name]) {
        var seenMethod = methodsSeen[method.name].sig;
        var iname = methodsSeen[method.name].interfaceName;
        if (stringify(method) !== stringify(seenMethod)) {
          throw new Error('Method ' + method.name + ' has conflicting ' +
                          'signatures in ' + iname + ' and ' + sig.name);
        }
      } else {
        methodsSeen[method.name] = {
          sig: method,
          interfaceName: sig.name
        };
      }
    });
  });
}
