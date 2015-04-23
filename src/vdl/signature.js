// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Generator of service signature from JavaScript object.
 * This signature can optionally include additional information in a
 * descriptor object.
 * @private
 */

module.exports = Signature;

var types = require('./types');
var vdlsig = require('../gen-vdl/v.io/v23/vdlroot/signature');
var ReflectSignature = require('./reflect-signature');
var vlog = require('../lib/vlog');

// Each argument type is JSValue.
// This can be overriden by specifying types in the description.
var defaultArgType = types.JSVALUE;

// Default to returning a single out arg.
var defaultOutArgs = [
  {
    type: defaultArgType
  }
];

// Streaming default arg description.
var defaultStreamingArg = {
    type: defaultArgType
};

function Signature(service, desc) {
  if (!(this instanceof Signature)) {
    return new Signature(service, desc);
  }
  if (typeof desc !== 'object') {
    desc = {};
  }

  vdlsig.Interface.call(this);

  var reflectSig = new ReflectSignature(service);

  copyIfSet(this, desc, ['name', 'pkgPath', 'doc', 'embeds']);

  this.methods = [];
  var methods = this.methods;
  reflectSig.methods.forEach(function(reflectMethod) {
    var thisMethod = {
      name: reflectMethod.name,
      inArgs: reflectMethod.inArgs,
      outArgs: defaultOutArgs
    };

    // Assign default arg type to each inArg.
    if (reflectMethod.inArgs) {
      thisMethod.inArgs.forEach(function(inArg) {
        inArg.type = defaultArgType;
      });
    }

    // Assign default streaming args.
    if (reflectMethod.streaming) {
      thisMethod.inStream = defaultStreamingArg;
      thisMethod.outStream = defaultStreamingArg;
    }

    if (desc.hasOwnProperty('methods')) {
      var foundMethods = desc.methods.filter(function(meth) {
        return meth.name === reflectMethod.name;
      });
      if (foundMethods.length === 0) {
        return;
      }
      if (foundMethods.length !== 1) {
        throw new Error('Duplicate method description for method ' +
                        reflectMethod.name);
      }
      var descMethod = foundMethods[0];

      if (descMethod.hasOwnProperty('inArgs')) {
        if (!Array.isArray(descMethod.inArgs)) {
          throw new Error('inArgs expected to be an array');
        }

        var thisArgs = thisMethod.inArgs;
        var descArgs = descMethod.inArgs;

        if (thisArgs.length === descArgs.length) {
          // Copy arg details.
          for (var argix = 0; argix < thisArgs.length; argix++) {
            copyIfSet(thisArgs[argix], descArgs[argix],
                      ['doc', 'type', 'name']);
          }
        } else {
          // TODO(bprosnitz) What about methods that use the
          // arguments variable and don't declare arguments.
          // TODO(bprosnitz) How would this look if we support vararg
          // in the future?
          vlog.logger.warn('Args of method ' + thisMethod.name + ' don\'t ' +
                           'match descriptor');
        }
      }

      copyIfSet(thisMethod, descMethod, ['doc', 'outArgs', 'tags']);
      if (reflectMethod.streaming === true) {
        copyIfSet(thisMethod, descMethod, ['inStream', 'outStream']);
      }

      // Only add the method if it is in the desc passed in.
      methods.push(new vdlsig.Method(thisMethod));
    }
  });
}

Signature.prototype = new vdlsig.Interface();

function copyIfSet(dst, src, fields) {
  for (var i = 0; i < fields.length; i++) {
      var fieldName = fields[i];
      if (src.hasOwnProperty(fieldName)) {
          dst[fieldName] = src[fieldName];
      }
  }
}
