/**
 * @fileoverview A method to create an array of signatures for a service
 * based on the descriptions passed in.
 */
module.exports = createSignatures;

var vom = require('vom');
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

  // TODO(bjornick): What should we do if different interfaces have different
  // types on the same method.
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
      var name = vom.MiscUtil.capitalize(methodName);
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

  return sigs;
}
