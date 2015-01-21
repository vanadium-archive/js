/**
 * @fileoverview Generator of service signature from javascript object.
 * This signature can optionally include additional information in a
 * descriptor object.
 * @private
 */

module.exports = Signature;

var vom = require('vom');
var vdlsig =
    require('../v.io/core/veyron2/vdl/vdlroot/src/signature/signature');
var ReflectSignature = require('./reflect-signature');
var vlog = require('../lib/vlog');

var defaultOutArgs = [
  {
    type: vom.Types.ANY
  }
];

var defaultStreamingArg = {
    type: vom.Types.ANY
};

function Signature(service, desc) {
  if (!(this instanceof Signature)) {
    return new Signature(service, desc);
  }
  if (typeof desc !== 'object') {
    desc = {};
  }

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

      // Only add the method if it is in the desc passed in.
      methods.push(thisMethod);


      if (descMethod.hasOwnProperty('inArgs')) {
        if (!Array.isArray(descMethod.inArgs)) {
          throw new Error('inArgs expected to be an array');
        }

        var thisArgs = thisMethod.inArgs;
        var descArgs = descMethod.inArgs;

        if (thisArgs.length !== descArgs.length) {
          // TODO(bprosnitz) What about methods that use the
          // arguments variable and don't declare arguments.
          // TODO(bprosnitz) How would this look if we support vararg
          // in the future?
          vlog.warn('Args of method ' + thisMethod + ' don\'t ' +
                    'match descriptor');
          return; // Skip this method because args don't match.
        }

        // Check that arg names match.
        var skip = false;
        for (var argix = 0; argix < thisArgs.length; argix++) {
          if (thisArgs[argix].name !== descArgs[argix].name) {
            skip = true;
            break;
          }
        }
        if (skip) {
          vlog.warn('Args of method ' + thisMethod + ' don\'t ' +
                    'match descriptor');
          return;
        }

        // Copy arg details.
        for (argix = 0; argix < thisArgs.length; argix++) {
          copyIfSet(thisArgs[argix], descArgs[argix],
                    ['doc', 'type']);
        }
      }

      copyIfSet(thisMethod, descMethod, ['doc', 'outArgs', 'tags']);

      if (reflectMethod.streaming === true) {
        delete['inStream'];
        delete['outStream'];
        copyIfSet(thisMethod, descMethod, ['inStream', 'outStream']);
      }
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
